package com.mohsendastaran.social_wrapped

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.CallLog
import android.provider.ContactsContract
import android.provider.Telephony
import android.telephony.PhoneNumberUtils
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/** Local SMS / MMS / call-log dump as compact JSON for the Rust analyzer. */
class DeviceInboxReader(private val context: Context) {
  fun read(kind: String): String {
    val events =
      if (kind == "calls") {
        readCalls()
      } else {
        readSms() + readMms()
      }
    return serialize(kind, events)
  }

  private data class DeviceEvent(
    val threadKey: String,
    val name: String,
    val dateMs: Long,
    val hour: Int,
    val dateStr: String,
    val isMine: Boolean,
    val isGroup: Boolean,
    val body: String,
    val kind: String,
    val durationSecs: Int,
    val address: String = "",
  )

  private val contactNames = HashMap<String, String>()
  private val canReadContacts: Boolean by lazy {
    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun serialize(kind: String, events: List<DeviceEvent>): String {
    val arr = JSONArray()
    for (event in events) {
      arr.put(
        JSONObject()
          .put("threadKey", event.threadKey)
          .put("name", event.name)
          .put("dateMs", event.dateMs)
          .put("hour", event.hour)
          .put("dateStr", event.dateStr)
          .put("isMine", event.isMine)
          .put("isGroup", event.isGroup)
          .put("body", event.body)
          .put("kind", event.kind)
          .put("durationSecs", event.durationSecs)
          .put("address", event.address),
      )
    }
    return JSONObject().put("kind", kind).put("events", arr).toString()
  }

  private fun readSms(): List<DeviceEvent> {
    val resolver = context.contentResolver
    val projection =
      arrayOf(
        Telephony.Sms.THREAD_ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.DATE,
        Telephony.Sms.TYPE,
        Telephony.Sms.BODY,
      )
    val events = ArrayList<DeviceEvent>()
    resolver
      .query(Telephony.Sms.CONTENT_URI, projection, null, null, "${Telephony.Sms.DATE} ASC")
      .use { cursor ->
        if (cursor == null) return events
        val threadIdx = cursor.indexOf(Telephony.Sms.THREAD_ID)
        val addressIdx = cursor.indexOf(Telephony.Sms.ADDRESS)
        val dateIdx = cursor.indexOf(Telephony.Sms.DATE)
        val typeIdx = cursor.indexOf(Telephony.Sms.TYPE)
        val bodyIdx = cursor.indexOf(Telephony.Sms.BODY)
        while (cursor.moveToNext()) {
          val type = cursor.getIntOrNull(typeIdx) ?: continue
          if (type == Telephony.Sms.MESSAGE_TYPE_DRAFT) continue
          val address = cursor.getStringOrEmpty(addressIdx)
          val dateMs = cursor.getLongOrNull(dateIdx) ?: continue
          val body = cursor.getStringOrEmpty(bodyIdx)
          val isMine = type == Telephony.Sms.MESSAGE_TYPE_SENT ||
            type == Telephony.Sms.MESSAGE_TYPE_OUTBOX ||
            type == Telephony.Sms.MESSAGE_TYPE_FAILED ||
            type == Telephony.Sms.MESSAGE_TYPE_QUEUED
          val key = threadKey(address).ifEmpty {
            "sms-thread:${cursor.getLongOrNull(threadIdx) ?: 0}"
          }
          val (hour, dateStr) = localParts(dateMs)
          events.add(
            DeviceEvent(
              threadKey = key,
              name = displayName(address, key),
              dateMs = dateMs,
              hour = hour,
              dateStr = dateStr,
              isMine = isMine,
              isGroup = false,
              body = body,
              kind = if (body.isBlank()) "other" else "text",
              durationSecs = 0,
              address = address,
            ),
          )
        }
      }
    return events
  }

  private fun readMms(): List<DeviceEvent> {
    val resolver = context.contentResolver
    val projection =
      arrayOf(
        Telephony.Mms._ID,
        Telephony.Mms.THREAD_ID,
        Telephony.Mms.DATE,
        Telephony.Mms.MESSAGE_BOX,
      )
    val events = ArrayList<DeviceEvent>()
    resolver
      .query(Telephony.Mms.CONTENT_URI, projection, null, null, "${Telephony.Mms.DATE} ASC")
      .use { cursor ->
        if (cursor == null) return events
        val idIdx = cursor.indexOf(Telephony.Mms._ID)
        val threadIdx = cursor.indexOf(Telephony.Mms.THREAD_ID)
        val dateIdx = cursor.indexOf(Telephony.Mms.DATE)
        val boxIdx = cursor.indexOf(Telephony.Mms.MESSAGE_BOX)
        while (cursor.moveToNext()) {
          val box = cursor.getIntOrNull(boxIdx) ?: continue
          if (box == Telephony.Mms.MESSAGE_BOX_DRAFTS) continue
          val mmsId = cursor.getLongOrNull(idIdx) ?: continue
          val threadId = cursor.getLongOrNull(threadIdx) ?: 0L
          // Telephony.Mms.DATE is seconds; SMS/call log use milliseconds.
          val dateMs = (cursor.getLongOrNull(dateIdx) ?: continue) * 1000L
          val isMine = box == Telephony.Mms.MESSAGE_BOX_SENT ||
            box == Telephony.Mms.MESSAGE_BOX_OUTBOX ||
            box == Telephony.Mms.MESSAGE_BOX_FAILED
          val peers = mmsPeerAddresses(mmsId)
          val isGroup = peers.size > 1
          val address = peers.firstOrNull().orEmpty()
          val key =
            if (isGroup) {
              "mms-thread:$threadId"
            } else {
              threadKey(address).ifEmpty { "mms-thread:$threadId" }
            }
          val body = mmsText(mmsId)
          val (hour, dateStr) = localParts(dateMs)
          val groupName =
            if (isGroup) {
              peers.map { displayName(it, threadKey(it)) }.filter { it.isNotBlank() }.joinToString(", ")
                .ifBlank { "Group" }
            } else {
              displayName(address, key)
            }
          events.add(
            DeviceEvent(
              threadKey = key,
              name = groupName,
              dateMs = dateMs,
              hour = hour,
              dateStr = dateStr,
              isMine = isMine,
              isGroup = isGroup,
              body = body,
              kind = if (body.isBlank()) "file" else "text",
              durationSecs = 0,
              address = if (isGroup) "" else address,
            ),
          )
        }
      }
    return events
  }

  private fun mmsPeerAddresses(mmsId: Long): List<String> {
    val uri = Uri.parse("content://mms/$mmsId/addr")
    val peers = ArrayList<String>()
    context.contentResolver
      .query(uri, arrayOf("address", "type"), null, null, null)
      .use { cursor ->
        if (cursor == null) return peers
        val addressIdx = cursor.indexOf("address")
        while (cursor.moveToNext()) {
          val raw = cursor.getStringOrEmpty(addressIdx)
          if (raw.isBlank() || raw.equals("insert-address-token", ignoreCase = true)) continue
          peers.add(raw)
        }
      }
    return peers.distinctBy { threadKey(it) }
  }

  private fun mmsText(mmsId: Long): String {
    val parts = StringBuilder()
    context.contentResolver
      .query(
        Uri.parse("content://mms/part"),
        arrayOf(Telephony.Mms.Part.MSG_ID, Telephony.Mms.Part.CONTENT_TYPE, Telephony.Mms.Part.TEXT),
        "${Telephony.Mms.Part.MSG_ID}=?",
        arrayOf(mmsId.toString()),
        null,
      )
      .use { cursor ->
        if (cursor == null) return ""
        val ctIdx = cursor.indexOf(Telephony.Mms.Part.CONTENT_TYPE)
        val textIdx = cursor.indexOf(Telephony.Mms.Part.TEXT)
        while (cursor.moveToNext()) {
          val ct = cursor.getStringOrEmpty(ctIdx).lowercase(Locale.US)
          if (!ct.startsWith("text/")) continue
          val text = cursor.getStringOrEmpty(textIdx)
          if (text.isNotBlank()) {
            if (parts.isNotEmpty()) parts.append('\n')
            parts.append(text)
          }
        }
      }
    return parts.toString()
  }

  private fun readCalls(): List<DeviceEvent> {
    val resolver = context.contentResolver
    val projection =
      arrayOf(
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DATE,
        CallLog.Calls.DURATION,
      )
    val events = ArrayList<DeviceEvent>()
    resolver
      .query(CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} ASC")
      .use { cursor ->
        if (cursor == null) return events
        val numberIdx = cursor.indexOf(CallLog.Calls.NUMBER)
        val nameIdx = cursor.indexOf(CallLog.Calls.CACHED_NAME)
        val typeIdx = cursor.indexOf(CallLog.Calls.TYPE)
        val dateIdx = cursor.indexOf(CallLog.Calls.DATE)
        val durationIdx = cursor.indexOf(CallLog.Calls.DURATION)
        while (cursor.moveToNext()) {
          val type = cursor.getIntOrNull(typeIdx) ?: continue
          val dateMs = cursor.getLongOrNull(dateIdx) ?: continue
          val number = cursor.getStringOrEmpty(numberIdx)
          val cached = cursor.getStringOrEmpty(nameIdx)
          val duration = (cursor.getLongOrNull(durationIdx) ?: 0L).toInt().coerceAtLeast(0)
          val isMine = type == CallLog.Calls.OUTGOING_TYPE
          val key = threadKey(number).ifEmpty { "unknown" }
          val name =
            cached.ifBlank { displayName(number, key) }.ifBlank { number.ifBlank { "Unknown" } }
          val (hour, dateStr) = localParts(dateMs)
          events.add(
            DeviceEvent(
              threadKey = key,
              name = name,
              dateMs = dateMs,
              hour = hour,
              dateStr = dateStr,
              isMine = isMine,
              isGroup = false,
              body = "",
              kind = callKind(type, duration),
              durationSecs = duration,
              address = formatAddress(number),
            ),
          )
        }
      }
    return events
  }

  private fun callKind(type: Int, duration: Int): String {
    return when (type) {
      CallLog.Calls.REJECTED_TYPE -> "rejected"
      CallLog.Calls.BLOCKED_TYPE -> "blocked"
      CallLog.Calls.VOICEMAIL_TYPE -> "voicemail"
      CallLog.Calls.MISSED_TYPE -> "missed"
      CallLog.Calls.INCOMING_TYPE,
      CallLog.Calls.OUTGOING_TYPE,
      CallLog.Calls.ANSWERED_EXTERNALLY_TYPE,
      -> if (duration > 0) "answered" else "missed"
      else -> if (duration > 0) "answered" else "missed"
    }
  }

  private fun formatAddress(raw: String): String {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return ""
    val region = Locale.getDefault().country.ifBlank { "US" }
    return PhoneNumberUtils.formatNumber(trimmed, region)?.takeIf { it.isNotBlank() } ?: trimmed
  }

  private fun displayName(address: String, key: String): String {
    if (key == "unknown" && address.isBlank()) return "Unknown"
    lookupContact(address)?.let { return it }
    return address.ifBlank { "Unknown" }
  }

  private fun lookupContact(address: String): String? {
    if (!canReadContacts || address.isBlank() || address.any { it.isLetter() }) return null
    val key = threadKey(address)
    if (key == "unknown") return null
    contactNames[key]?.let { return it }
    val uri =
      Uri.withAppendedPath(
        ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
        Uri.encode(address),
      )
    val name =
      context.contentResolver
        .query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)
        .use { cursor ->
          if (cursor != null && cursor.moveToFirst()) {
            cursor.getStringOrEmpty(0).ifBlank { null }
          } else {
            null
          }
        }
    if (name != null) contactNames[key] = name
    return name
  }

  private fun threadKey(raw: String?): String {
    val s = raw?.trim().orEmpty()
    if (s.isEmpty() || s.equals("insert-address-token", ignoreCase = true)) return "unknown"
    if (s.any { it.isLetter() }) return s.lowercase(Locale.US)
    val normalized = PhoneNumberUtils.normalizeNumber(s).orEmpty()
    val digits = normalized.filter { it.isDigit() }
    return digits.ifEmpty { s }
  }

  private fun localParts(dateMs: Long): Pair<Int, String> {
    val cal = Calendar.getInstance()
    cal.timeInMillis = dateMs
    val hour = cal.get(Calendar.HOUR_OF_DAY)
    val dateStr =
      String.format(
        Locale.US,
        "%04d-%02d-%02d",
        cal.get(Calendar.YEAR),
        cal.get(Calendar.MONTH) + 1,
        cal.get(Calendar.DAY_OF_MONTH),
      )
    return hour to dateStr
  }
}

private fun Cursor.indexOf(column: String): Int = getColumnIndex(column)

private fun Cursor.getStringOrEmpty(index: Int): String {
  if (index < 0 || isNull(index)) return ""
  return getString(index) ?: ""
}

private fun Cursor.getIntOrNull(index: Int): Int? {
  if (index < 0 || isNull(index)) return null
  return getInt(index)
}

private fun Cursor.getLongOrNull(index: Int): Long? {
  if (index < 0 || isNull(index)) return null
  return getLong(index)
}
