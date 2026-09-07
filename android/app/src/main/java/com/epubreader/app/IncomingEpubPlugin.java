package com.epubreader.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.database.Cursor;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "IncomingEpub")
public class IncomingEpubPlugin extends Plugin {
    private static final int MAX_IMPORT = 150;
    private static final int MAX_DEPTH = 5;

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
                call.reject("Could not open EPUB");
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
        launch.setData(Uri.parse("epubreader://book/" + id));
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
            if (in == null) throw new Exception("Could not open " + name);
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
}
