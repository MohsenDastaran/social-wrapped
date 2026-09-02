package com.mohsendastaran.social_wrapped

import android.Manifest
import android.app.Activity
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import kotlin.concurrent.thread

@InvokeArg
class ReadInboxArgs {
  lateinit var kind: String
}

@TauriPlugin(
  permissions = [
    Permission(strings = [Manifest.permission.READ_SMS], alias = "sms"),
    Permission(strings = [Manifest.permission.READ_CALL_LOG], alias = "calls"),
    Permission(strings = [Manifest.permission.READ_CONTACTS], alias = "contacts"),
  ],
)
class DeviceInboxPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun readInbox(invoke: Invoke) {
    val args = invoke.parseArgs(ReadInboxArgs::class.java)
    val required = requiredAlias(args.kind)
    if (required == null) {
      invoke.reject("Unknown on-device source. Use SMS or calls.")
      return
    }

    val aliases = ArrayList<String>()
    if (getPermissionState(required) != PermissionState.GRANTED) {
      aliases.add(required)
    }
    val contactsState = getPermissionState("contacts")
    if (contactsState == PermissionState.PROMPT ||
      contactsState == PermissionState.PROMPT_WITH_RATIONALE
    ) {
      aliases.add("contacts")
    }

    if (aliases.isNotEmpty()) {
      requestPermissionForAliases(aliases.toTypedArray(), invoke, "onReadInboxPermission")
      return
    }

    startRead(invoke, args.kind)
  }

  @PermissionCallback
  fun onReadInboxPermission(invoke: Invoke) {
    val args = invoke.parseArgs(ReadInboxArgs::class.java)
    val required = requiredAlias(args.kind)
    if (required == null) {
      invoke.reject("Unknown on-device source. Use SMS or calls.")
      return
    }
    if (getPermissionState(required) != PermissionState.GRANTED) {
      invoke.reject(
        if (required == "calls") {
          "Call log access was denied. Enable it in Android settings to analyze calls."
        } else {
          "SMS access was denied. Enable it in Android settings to analyze texts."
        },
      )
      return
    }
    startRead(invoke, args.kind)
  }

  private fun startRead(invoke: Invoke, kind: String) {
    thread(name = "device-inbox-read") {
      try {
        val payload = DeviceInboxReader(activity).read(kind)
        val ret = JSObject()
        ret.put("payload", payload)
        invoke.resolve(ret)
      } catch (error: SecurityException) {
        invoke.reject(
          if (kind == "calls") {
            "Call log access was denied. Enable it in Android settings to analyze calls."
          } else {
            "SMS access was denied. Enable it in Android settings to analyze texts."
          },
        )
      } catch (error: Exception) {
        invoke.reject(error.message ?: "Could not read this phone.")
      }
    }
  }

  private fun requiredAlias(kind: String): String? {
    return when (kind) {
      "sms" -> "sms"
      "calls" -> "calls"
      else -> null
    }
  }
}
