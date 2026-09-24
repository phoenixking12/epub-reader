package com.loreguard.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.database.Cursor;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
        name = "IncomingEpub",
        permissions = {
            @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
        }
)
public class IncomingEpubPlugin extends Plugin {
    private static final int MAX_IMPORT = 150;
    private static final int MAX_SCAN = 250;
    private static final int MAX_DEPTH = 5;
    private static final int SCAN_DEPTH = 8;

    @PluginMethod
    public void consume(PluginCall call) {
        Intent intent = getActivity().getIntent();
        Uri uri = intent.getData();
        if (uri == null) {
            if (Build.VERSION.SDK_INT >= 33) {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            } else {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
        }
        if (uri == null) {
            JSObject ret = new JSObject();
            ret.put("found", false);
            call.resolve(ret);
            return;
        }
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) {
                call.reject("Could not open that file");
                return;
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
            }
            JSObject ret = new JSObject();
            ret.put("found", true);
            ret.put("name", displayName(uri));
            ret.put("base64", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            intent.setData(null);
            intent.removeExtra(Intent.EXTRA_STREAM);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void importFiles(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
            "application/epub+zip",
            "application/octet-stream",
            "*/*"
        });
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "onFilesPicked");
    }

    @PluginMethod
    public void importFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "onFolderPicked");
    }

    @PluginMethod
    public void scanDevice(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 30) {
            if (!Environment.isExternalStorageManager()) {
                promptAllFilesAccess();
                JSObject ret = new JSObject();
                ret.put("items", new JSArray());
                ret.put("needsPermission", true);
                call.resolve(ret);
                return;
            }
        } else if (getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "onStorageGranted");
            return;
        }
        runScan(call);
    }

    @PermissionCallback
    private void onStorageGranted(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("items", new JSArray());
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }
        runScan(call);
    }

    @ActivityCallback
    private void onFilesPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        JSArray items = new JSArray();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            ret.put("items", items);
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }
        Intent data = result.getData();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount() && items.length() < MAX_IMPORT; i++) {
                addCopiedEpub(clip.getItemAt(i).getUri(), items);
            }
        } else if (data.getData() != null) {
            addCopiedEpub(data.getData(), items);
        }
        ret.put("items", items);
        ret.put("cancelled", false);
        call.resolve(ret);
    }

    @ActivityCallback
    private void onFolderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        JSArray items = new JSArray();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            ret.put("items", items);
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }
        Uri treeUri = result.getData().getData();
        try {
            collectFromTree(treeUri, DocumentsContract.getTreeDocumentId(treeUri), items, 0);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Could not read folder");
            return;
        }
        ret.put("items", items);
        ret.put("cancelled", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void pinShortcut(PluginCall call) {
        String id = call.getString("id");
        String title = call.getString("title");
        if (id == null || title == null) {
            call.reject("id and title required");
            return;
        }
        if (Build.VERSION.SDK_INT < 26) {
            call.reject("Home shortcuts need Android 8 or newer");
            return;
        }
        ShortcutManager sm = getContext().getSystemService(ShortcutManager.class);
        if (sm == null || !sm.isRequestPinShortcutSupported()) {
            call.reject("Pinning is not supported on this launcher");
            return;
        }
        Intent launch = new Intent(getContext(), MainActivity.class);
        launch.setAction(Intent.ACTION_VIEW);
        launch.setData(Uri.parse("loreguard://book/" + id));
        ShortcutInfo info = new ShortcutInfo.Builder(getContext(), id)
                .setShortLabel(title.length() > 12 ? title.substring(0, 12) : title)
                .setLongLabel(title)
                .setIntent(launch)
                .setIcon(Icon.createWithResource(getContext(), R.mipmap.ic_launcher))
                .build();
        sm.requestPinShortcut(info, null);
        call.resolve();
    }

    private void collectFromTree(Uri treeUri, String docId, JSArray items, int depth) {
        if (depth > MAX_DEPTH || items.length() >= MAX_IMPORT) return;
        ContentResolver resolver = getContext().getContentResolver();
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, docId);
        try (Cursor cursor = resolver.query(
                children,
                new String[] {
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE
                },
                null,
                null,
                null
        )) {
            if (cursor == null) return;
            while (cursor.moveToNext() && items.length() < MAX_IMPORT) {
                String childId = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    collectFromTree(treeUri, childId, items, depth + 1);
                    continue;
                }
                if (!isEpub(name, mime)) continue;
                Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, childId);
                addCopiedEpub(fileUri, name, items);
            }
        } catch (Exception ignored) {
            /* some providers reject listing; skip that folder */
        }
    }

    private void addCopiedEpub(Uri uri, JSArray items) {
        addCopiedEpub(uri, displayName(uri), items);
    }

    private void addCopiedEpub(Uri uri, String name, JSArray items) {
        if (uri == null || items.length() >= MAX_IMPORT) return;
        if (!isEpub(name, null)) return;
        try {
            items.put(copyToAppStorage(uri, name));
        } catch (Exception ignored) {
            /* skip unreadable file */
        }
    }

    private JSObject copyToAppStorage(Uri uri, String name) throws Exception {
        String id = UUID.randomUUID().toString();
        File dir = new File(getContext().getFilesDir(), "books");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("Could not create book storage");
        }
        File dest = new File(dir, id + ".epub");
        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             OutputStream out = new FileOutputStream(dest)) {
            if (in == null) throw new Exception("Could not open that file");
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
            }
        }
        JSObject item = new JSObject();
        item.put("id", id);
        item.put("name", name != null ? name : "book.epub");
        item.put("path", "books/" + id + ".epub");
        return item;
    }

    private String displayName(Uri uri) {
        if (uri == null) return "book.epub";
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                String name = cursor.getString(0);
                if (name != null && !name.isEmpty()) return name;
            }
        } catch (Exception ignored) {
            /* use path */
        }
        String last = uri.getLastPathSegment();
        return last != null ? last : "book.epub";
    }

    private boolean isEpub(String name, String mime) {
        if (mime != null && mime.toLowerCase(Locale.US).contains("epub")) return true;
        if (name == null) return false;
        return name.toLowerCase(Locale.US).endsWith(".epub");
    }

    private void promptAllFilesAccess() {
        Activity activity = getActivity();
        if (activity == null) return;
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            activity.startActivity(intent);
        } catch (Exception e) {
            try {
                activity.startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
            } catch (Exception ignored) {
                /* user can grant from system settings */
            }
        }
    }

    private void runScan(PluginCall call) {
        new Thread(() -> {
            JSArray items = new JSArray();
            Set<String> seen = new HashSet<>();
            File appBooks = new File(getContext().getFilesDir(), "books");
            File root = Environment.getExternalStorageDirectory();
            if (root != null) walkForEpubs(root, items, seen, appBooks, 0);
            queryMediaStore(items, seen);
            JSObject ret = new JSObject();
            ret.put("items", items);
            ret.put("needsPermission", false);
            ret.put("cancelled", false);
            call.resolve(ret);
        }, "lg-epub-scan").start();
    }

    private void walkForEpubs(File dir, JSArray items, Set<String> seen, File appBooks, int depth) {
        if (dir == null || depth > SCAN_DEPTH || items.length() >= MAX_SCAN) return;
        if (!dir.isDirectory()) return;
        String name = dir.getName();
        if (name.startsWith(".") || skipScanDir(name)) return;
        try {
            if (appBooks != null && dir.getCanonicalPath().startsWith(appBooks.getCanonicalPath())) return;
        } catch (Exception ignored) {
            /* continue */
        }
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File child : children) {
            if (items.length() >= MAX_SCAN) return;
            if (child.isDirectory()) {
                walkForEpubs(child, items, seen, appBooks, depth + 1);
                continue;
            }
            if (!isEpub(child.getName(), null)) continue;
            addCopiedFile(child, items, seen);
        }
    }

    private boolean skipScanDir(String name) {
        String n = name.toLowerCase(Locale.US);
        return n.equals("android") || n.equals("dcim") || n.equals("pictures")
                || n.equals("movies") || n.equals("music") || n.equals("alarms")
                || n.equals("ringtones") || n.equals("notifications") || n.equals("podcasts")
                || n.equals("recordings") || n.equals("thumbnails");
    }

    private void queryMediaStore(JSArray items, Set<String> seen) {
        if (items.length() >= MAX_SCAN) return;
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = MediaStore.Files.getContentUri("external");
        String[] projection = {
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.MIME_TYPE
        };
        try (Cursor cursor = resolver.query(
                uri,
                projection,
                MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?",
                new String[] { "%.epub" },
                null
        )) {
            if (cursor == null) return;
            int idCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
            int nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
            int mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
            while (cursor.moveToNext() && items.length() < MAX_SCAN) {
                String name = nameCol >= 0 ? cursor.getString(nameCol) : null;
                String mime = mimeCol >= 0 ? cursor.getString(mimeCol) : null;
                if (!isEpub(name, mime)) continue;
                Uri fileUri = ContentUris.withAppendedId(uri, cursor.getLong(idCol));
                addCopiedEpub(fileUri, name, items, seen);
            }
        } catch (Exception ignored) {
            /* MediaStore may refuse the query without extra access */
        }
    }

    private void addCopiedFile(File file, JSArray items, Set<String> seen) {
        if (file == null || items.length() >= MAX_SCAN) return;
        String key;
        try {
            key = file.getCanonicalPath();
        } catch (Exception e) {
            key = file.getAbsolutePath();
        }
        if (!seen.add(key.toLowerCase(Locale.US))) return;
        try {
            items.put(copyStreamToAppStorage(new FileInputStream(file), file.getName()));
        } catch (Exception ignored) {
            seen.remove(key.toLowerCase(Locale.US));
        }
    }

    private void addCopiedEpub(Uri uri, String name, JSArray items, Set<String> seen) {
        if (uri == null || items.length() >= MAX_SCAN) return;
        if (!isEpub(name, null)) return;
        String key = uri.toString();
        if (!seen.add(key)) return;
        try {
            items.put(copyToAppStorage(uri, name));
        } catch (Exception ignored) {
            seen.remove(key);
        }
    }

    private JSObject copyStreamToAppStorage(InputStream in, String name) throws Exception {
        String id = UUID.randomUUID().toString();
        File dir = new File(getContext().getFilesDir(), "books");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("Could not create book storage");
        }
        File dest = new File(dir, id + ".epub");
        try (InputStream input = in; OutputStream out = new FileOutputStream(dest)) {
            if (input == null) throw new Exception("Could not open that file");
            byte[] buf = new byte[8192];
            int n;
            while ((n = input.read(buf)) > 0) {
                out.write(buf, 0, n);
            }
        }
        JSObject item = new JSObject();
        item.put("id", id);
        item.put("name", name != null ? name : "book.epub");
        item.put("path", "books/" + id + ".epub");
        return item;
    }
}
