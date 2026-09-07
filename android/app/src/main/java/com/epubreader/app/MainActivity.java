package com.epubreader.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingEpubPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
