package com.epubreader.app;

import android.view.KeyEvent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VolumeKeys")
public class VolumeKeysPlugin extends Plugin {
    private boolean enabled = false;

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean value = call.getBoolean("enabled");
        enabled = Boolean.TRUE.equals(value);
        call.resolve();
    }

    public boolean handleKey(int keyCode) {
        if (!enabled) return false;
        if (keyCode != KeyEvent.KEYCODE_VOLUME_UP && keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {
            return false;
        }
        JSObject data = new JSObject();
        data.put("direction", keyCode == KeyEvent.KEYCODE_VOLUME_UP ? "up" : "down");
        notifyListeners("volume", data);
        return true;
    }
}
