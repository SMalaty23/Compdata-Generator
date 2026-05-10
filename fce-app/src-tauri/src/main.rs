#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize, Deserialize, Clone)]
struct FolderResult {
    files: HashMap<String, String>,
    folder_path: String,
}

#[derive(Serialize, Deserialize)]
struct SaveResult {
    success: bool,
    folder: Option<String>,
    saved: Vec<String>,
}

fn read_utf16le(path: &PathBuf) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let start = if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE { 2 } else { 0 };
    let u16_iter = bytes[start..]
        .chunks_exact(2)
        .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]));
    let result: String = char::decode_utf16(u16_iter)
        .map(|r| r.unwrap_or('\u{FFFD}'))
        .collect();
    Ok(result)
}

fn read_txt_files(folder_path: &str, is_database: bool) -> Result<FolderResult, String> {
    let path = PathBuf::from(folder_path);
    let mut files: HashMap<String, String> = HashMap::new();
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let epath = entry.path();
        if epath.is_file() {
            if let Some(ext) = epath.extension() {
                if ext == "txt" {
                    let filename = epath.file_name().unwrap().to_string_lossy().to_lowercase();
                    let content = if is_database {
                        read_utf16le(&epath)?
                    } else {
                        fs::read_to_string(&epath).map_err(|e| e.to_string())?
                    };
                    files.insert(filename, content);
                }
            }
        }
    }

    Ok(FolderResult {
        files,
        folder_path: folder_path.to_string(),
    })
}

#[tauri::command]
async fn open_folder(app: tauri::AppHandle, folder_type: String) -> Result<FolderResult, String> {
    let is_database = folder_type == "database";

    let folder = app.dialog().file()
        .set_title(if is_database { "Select Database Folder" } else { "Select Compdata Folder" })
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let folder_str = path.to_string();
            read_txt_files(&folder_str, is_database)
        }
        None => Err("Cancelled".to_string()),
    }
}

#[tauri::command]
async fn save_files(app: tauri::AppHandle, files: HashMap<String, String>) -> Result<SaveResult, String> {
    let folder = app.dialog().file()
        .set_title("Select Output Folder")
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let folder_str = path.to_string();
            save_files_to_path(&folder_str, &files)
        }
        None => Ok(SaveResult { success: false, folder: None, saved: vec![] }),
    }
}

#[tauri::command]
fn save_files_to(files: HashMap<String, String>, folder_path: String) -> Result<SaveResult, String> {
    save_files_to_path(&folder_path, &files)
}

fn save_files_to_path(folder_path: &str, files: &HashMap<String, String>) -> Result<SaveResult, String> {
    let path = PathBuf::from(folder_path);
    let mut saved = Vec::new();
    for (filename, content) in files {
        let out_path = path.join(filename);
        fs::write(&out_path, content).map_err(|e| e.to_string())?;
        saved.push(filename.clone());
    }
    Ok(SaveResult {
        success: true,
        folder: Some(folder_path.to_string()),
        saved,
    })
}

#[tauri::command]
async fn save_zip(app: tauri::AppHandle, files: HashMap<String, String>, default_name: String) -> Result<SaveResult, String> {
    let save_path = app.dialog().file()
        .set_title("Save ZIP File")
        .set_file_name(&default_name)
        .add_filter("ZIP Archive", &["zip"])
        .blocking_save_file();

    match save_path {
        Some(file_path) => {
            let path_str = file_path.to_string();
            let file = fs::File::create(&path_str).map_err(|e| e.to_string())?;
            let mut zip_writer = zip::ZipWriter::new(file);
            let options = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            let mut saved = Vec::new();
            for (filename, content) in &files {
                zip_writer.start_file(filename, options).map_err(|e| e.to_string())?;
                zip_writer.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
                saved.push(filename.clone());
            }
            zip_writer.finish().map_err(|e| e.to_string())?;

            Ok(SaveResult { success: true, folder: Some(path_str), saved })
        }
        None => Ok(SaveResult { success: false, folder: None, saved: vec![] }),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_folder,
            save_files,
            save_zip,
            save_files_to
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}