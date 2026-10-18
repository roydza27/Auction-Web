#!/usr/bin/env python3
"""
Consolidate Player.xlsx with APL.csv, remove duplicates,
generate a clean player dataset (59 players), and download/organize photos.
"""

import os
import sys
import csv
import json
import shutil
import zipfile
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
EXCEL_PATH = os.path.join(BASE_DIR, "Player.xlsx")
CSV_PATH = os.path.join(BASE_DIR, "APL.csv")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
PLAYER_IMAGES_DIR = os.path.join(UPLOADS_DIR, "player-images")
OUTPUT_CSV_PATH = os.path.join(UPLOADS_DIR, "clean_players.csv")
OUTPUT_JSON_PATH = os.path.join(UPLOADS_DIR, "clean_players.json")

def parse_excel_rows(excel_path):
    """Parse rows from an .xlsx file using built-in zipfile and xml parser."""
    with zipfile.ZipFile(excel_path) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                if t is not None:
                    shared_strings.append(t.text or "")
                else:
                    text_parts = [part.text or "" for part in si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")]
                    shared_strings.append("".join(text_parts))

        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for r in sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row"):
            row_vals = []
            for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                t = c.get("t")
                v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                val = ""
                if v is not None and v.text is not None:
                    if t == "s":
                        idx = int(v.text)
                        val = shared_strings[idx] if idx < len(shared_strings) else ""
                    else:
                        val = v.text
                row_vals.append(val.strip())
            rows.append(row_vals)
    return rows

def parse_csv_rows(csv_path):
    """Parse rows from APL.csv."""
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)

def extract_gdrive_id(url):
    """Extract Google Drive file ID from various link formats."""
    if not url:
        return ""
    if "id=" in url:
        return url.split("id=")[1].split("&")[0].strip()
    if "/file/d/" in url:
        return url.split("/file/d/")[1].split("/")[0].strip()
    return ""

def is_valid_image(data):
    """Check magic bytes to verify if binary data is a valid image."""
    if len(data) < 12:
        return False
    # JPEG (FF D8 FF)
    if data[:3] == b"\xff\xd8\xff":
        return True
    # PNG (89 50 4E 47)
    if data[:4] == b"\x89PNG":
        return True
    # WebP (RIFF....WEBP)
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    # GIF (GIF87a or GIF89a)
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return True
    return False

def try_download_image(file_id, dest_path, timeout=3):
    """Try downloading from Google Drive using direct URL formats."""
    urls = [
        f"https://lh3.googleusercontent.com/d/{file_id}",
        f"https://drive.google.com/uc?id={file_id}&export=download",
        f"https://drive.google.com/thumbnail?id={file_id}&sz=w1000"
    ]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                content = response.read()
                if is_valid_image(content):
                    with open(dest_path, "wb") as f_out:
                        f_out.write(content)
                    return True
        except Exception:
            continue
    return False

def check_for_local_zip(uploads_dir):
    """Check if the user placed a Google Drive download zip in uploads/."""
    for f in os.listdir(uploads_dir):
        if f.endswith(".zip") and f != "APL Player Registration Form 2026.csv.zip":
            zip_path = os.path.join(uploads_dir, f)
            print(f"📦 Found potential photo zip file: {f}")
            return zip_path
    return None

def extract_photos_from_zip(zip_path, players, target_dir):
    """Extract and match photos from a Google Drive zip to players."""
    extracted_count = 0
    with zipfile.ZipFile(zip_path) as z:
        file_list = z.namelist()
        for player in players:
            p_name = player["name"].lower().replace(" ", "")
            dest_file = os.path.join(target_dir, f"{player['regNo']}.jpg")
            if os.path.exists(dest_file):
                continue
            for zf in file_list:
                clean_zf = os.path.basename(zf).lower().replace(" ", "")
                # Google Form exports typically name files like: "Name - Form Field.jpg"
                if p_name in clean_zf and any(clean_zf.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    with z.open(zf) as source, open(dest_file, "wb") as target:
                        target.write(source.read())
                    extracted_count += 1
                    break
    return extracted_count

def main():
    print("🚀 Starting Player Consolidation & Photo Downloader...")

    os.makedirs(PLAYER_IMAGES_DIR, exist_ok=True)

    # 1. Check if APL.xlsx or Player.xlsx is present
    apl_xlsx = os.path.join(BASE_DIR, "APL.xlsx")
    target_xlsx = apl_xlsx if os.path.exists(apl_xlsx) else EXCEL_PATH

    if not os.path.exists(target_xlsx):
        print(f"❌ Excel file not found: {target_xlsx}")
        sys.exit(1)
    
    excel_rows = parse_excel_rows(target_xlsx)
    print(f"📄 Loaded {os.path.basename(target_xlsx)}: {len(excel_rows)} total rows (including header)")

    players = []
    skipped_count = 0

    if target_xlsx == apl_xlsx:
        # APL.xlsx header: ['Timestamp', 'Email Address', 'Player Name', 'Player Year and Course', 'Player Specialization', 'Player College ID Photo', 'Player Photo', 'Upload Payment Screenshot']
        for idx in range(1, len(excel_rows)):
            row = excel_rows[idx]
            if not row or len(row) < 3 or not row[2].strip():
                print(f"   ⏩ Skipping row {idx + 1} in Excel (empty / excluded row)")
                skipped_count += 1
                continue

            timestamp = row[0].strip() if len(row) > 0 else ""
            email = row[1].strip() if len(row) > 1 else ""
            raw_name = row[2].strip()
            name = " ".join(raw_name.split())
            year_course = row[3].strip() if len(row) > 3 else ""
            position = row[4].strip() if len(row) > 4 else ""
            college_id_photo = row[5].strip() if len(row) > 5 else ""
            drive_photo = row[6].strip() if len(row) > 6 else ""
            payment_screenshot = row[7].strip() if len(row) > 7 else ""

            reg_no = f"APL-{len(players) + 1:03d}"
            local_filename = f"{reg_no}.jpg"
            photo_url = f"/uploads/player-images/{local_filename}"

            player = {
                "regNo": reg_no,
                "name": name,
                "class": year_course,
                "position": position,
                "photoUrl": photo_url,
                "localFilename": local_filename,
                "email": email,
                "drivePhotoUrl": drive_photo,
                "collegeIdPhoto": college_id_photo,
                "paymentScreenshot": payment_screenshot,
                "timestamp": timestamp,
            }
            players.append(player)
    else:
        # Fallback to Player.xlsx + APL.csv
        csv_rows = parse_csv_rows(CSV_PATH) if os.path.exists(CSV_PATH) else []
        for idx in range(1, len(excel_rows)):
            x_row = excel_rows[idx]
            csv_idx = idx - 1
            if not x_row or not any(x_row) or not x_row[0].strip():
                skipped_count += 1
                continue

            raw_name = x_row[0].strip()
            name = " ".join(raw_name.split())
            year_course = x_row[1].strip() if len(x_row) > 1 else ""
            position = x_row[2].strip() if len(x_row) > 2 else ""

            c_record = csv_rows[csv_idx] if csv_idx < len(csv_rows) else {}
            email = c_record.get("Username", "").strip()
            drive_photo = c_record.get("Player Photo", "").strip()
            college_id_photo = c_record.get("Player College ID Photo", "").strip()
            payment_screenshot = c_record.get("Upload Payment Screenshot ", "").strip()
            timestamp = c_record.get("Timestamp", "").strip()

            reg_no = f"APL-{len(players) + 1:03d}"
            local_filename = f"{reg_no}.jpg"
            photo_url = f"/uploads/player-images/{local_filename}"

            player = {
                "regNo": reg_no,
                "name": name,
                "class": year_course,
                "position": position,
                "photoUrl": photo_url,
                "localFilename": local_filename,
                "email": email,
                "drivePhotoUrl": drive_photo,
                "collegeIdPhoto": college_id_photo,
                "paymentScreenshot": payment_screenshot,
                "timestamp": timestamp,
            }
            players.append(player)

    print(f"\n✅ Total consolidated players: {len(players)} (skipped {skipped_count} excluded rows)")

    # 4. Attempt to download photos
    print("\n📸 Checking & downloading player photos...")
    downloaded_count = 0
    existing_count = 0
    auth_required_count = 0

    # First check if user dropped an unzipped folder or a zip
    photo_zip = check_for_local_zip(UPLOADS_DIR)
    if photo_zip:
        print(f"📦 Extracting photos from {photo_zip}...")
        extracted = extract_photos_from_zip(photo_zip, players, PLAYER_IMAGES_DIR)
        print(f"   Extracted {extracted} photos from zip.")

    # Check if first file is accessible before attempting 59 network requests
    first_file_id = extract_gdrive_id(players[0]["drivePhotoUrl"]) if players else ""
    is_accessible = False
    if first_file_id:
        test_path = os.path.join(PLAYER_IMAGES_DIR, "temp_test.jpg")
        is_accessible = try_download_image(first_file_id, test_path, timeout=3)
        if os.path.exists(test_path):
            os.remove(test_path)

    force_download = "--force" in sys.argv

    if not is_accessible and not force_download:
        print("⚠️  Google Drive files currently require authentication (private response folder).")
        print("   Skipping bulk download attempt to avoid timeout.")
        print("\n💡 TO DOWNLOAD PHOTOS AUTOMATICALLY:")
        print("   1. Open Google Drive, find the form's 'Player Photo' response folder.")
        print("   2. Right-click the folder -> 'Share' -> General access -> 'Anyone with the link' (Viewer).")
        print("   3. Run this script again: python3 backend/scripts/consolidate_and_download_photos.py")
        print("   👉 OR: Download the folder as a zip from Drive, place it into 'backend/uploads/', and re-run.")
        auth_required_count = len(players)
    else:
        for i, p in enumerate(players, 1):
            dest_path = os.path.join(PLAYER_IMAGES_DIR, p["localFilename"])

            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
                existing_count += 1
                continue

            file_id = extract_gdrive_id(p["drivePhotoUrl"])
            if not file_id:
                continue

            print(f"[{i}/{len(players)}] Downloading {p['name']} ({p['regNo']})...", end="", flush=True)
            success = try_download_image(file_id, dest_path)
            if success:
                print(" ✅ OK")
                downloaded_count += 1
            else:
                print(" ⚠️  Private/Login required")
                auth_required_count += 1

    print("\n📊 Photo Download Summary:")
    print(f"   - Already present: {existing_count}")
    print(f"   - Newly downloaded: {downloaded_count}")
    print(f"   - Require Google Drive sharing/login: {auth_required_count}")

    if auth_required_count > 0:
        print("\n💡 NOTE ON PRIVATE DRIVE FILES:")
        print("   Google Drive links for Google Form uploads are private by default.")
        print("   To download all remaining photos in one go:")
        print("   👉 In Google Drive: Right-click the 'Player Photo' responses folder -> 'Share' -> set 'Anyone with the link' to 'Viewer'.")
        print("      Then run this script again: python3 backend/scripts/consolidate_and_download_photos.py")
        print("   👉 OR: Download the folder as a zip from Google Drive and place it in 'backend/uploads/'.")

    # 5. Export clean_players.csv
    with open(OUTPUT_CSV_PATH, mode="w", newline="", encoding="utf-8") as f_out:
        fieldnames = ["name", "regNo", "class", "position", "photoUrl", "email", "drivePhotoUrl"]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        for p in players:
            writer.writerow({
                "name": p["name"],
                "regNo": p["regNo"],
                "class": p["class"],
                "position": p["position"],
                "photoUrl": p["photoUrl"],
                "email": p["email"],
                "drivePhotoUrl": p["drivePhotoUrl"],
            })
    print(f"\n💾 Saved clean CSV: {OUTPUT_CSV_PATH}")

    # 6. Export clean_players.json
    with open(OUTPUT_JSON_PATH, mode="w", encoding="utf-8") as f_out:
        json.dump(players, f_out, indent=2)
    print(f"💾 Saved clean JSON: {OUTPUT_JSON_PATH}")

    print("\n🎉 Consolidation completed successfully!")

if __name__ == "__main__":
    main()
