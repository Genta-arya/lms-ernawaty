/**
 * Service Upload Foto Profil ke Cloudinary
 * Mendukung Cloudinary Upload Widget Bawaan dengan Fitur Cropping 1:1,
 * Unsigned Preset (lmsernawaty) & Direct API Upload.
 */

/**
 * Memastikan script Cloudinary Upload Widget terpasang di window
 */
export async function loadCloudinaryScript() {
  if (typeof window !== "undefined" && window.cloudinary) return true

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="upload-widget.cloudinary.com"]')
    if (existing) {
      if (window.cloudinary) {
        resolve(true)
        return
      }
      existing.addEventListener("load", () => resolve(true))
      existing.addEventListener("error", (e) => reject(e))
      return
    }

    const script = document.createElement("script")
    script.src = "https://upload-widget.cloudinary.com/latest/global/all.js"
    script.type = "text/javascript"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = (e) => reject(new Error("Gagal memuat Cloudinary Widget script."))
    document.head.appendChild(script)
  })
}

/**
 * Membuka Cloudinary Upload Widget bawaan dengan fitur Interactive Cropping 1:1
 * Memberikan tampilan crop persegi, putar (rotate), zoom in/out, dan drag area crop.
 */
export async function openCloudinaryCropWidget({ onSuccess, onError, onClose }) {
  try {
    await loadCloudinaryScript()
  } catch (err) {
    if (onError) onError(err)
    return
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || "ephsphyt"
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || "lmsernawaty"

  if (!window.cloudinary) {
    if (onError) onError(new Error("Cloudinary Widget belum siap. Silakan muat ulang halaman."))
    return
  }

  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName: cloudName,
      uploadPreset: uploadPreset,
      sources: ["local", "camera", "url"],
      multiple: false,
      resourceType: "image",
      clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
      maxFileSize: 2097152, // 2MB (2 * 1024 * 1024 bytes)
      cropping: true,
      croppingAspectRatio: 1, // 1:1 square untuk foto profil
      croppingDefaultSelectionRatio: 0.9,
      croppingShowDimensions: true,
      showSkipCropButton: false, // Wajib crop agar foto pas proporsional
      croppingCoordinatesMode: "custom",
      folder: "lsm_profil_user",
      theme: "minimal",
      language: "id",
      text: {
        id: {
          or: "atau",
          back: "Kembali",
          advanced: "Lanjutan",
          close: "Tutup",
          no_results: "Tidak ada hasil",
          search_placeholder: "Cari foto...",
          about_uw: "Tentang Cloudinary",
          menu: {
            files: "Pilih dari Galeri/Komputer",
            web: "Alamat Web (URL)",
            camera: "Kamera HP / Webcam",
          },
          local: {
            browse: "Pilih Foto",
            dd_title_single: "Seret foto profil ke sini",
            drop_title_single: "Lepaskan foto untuk diunggah",
          },
          crop: {
            title: "Sesuaikan & Potong Foto Profil (1:1)",
            crop_btn: "Terapkan & Simpan Foto",
            skip_btn: "Lewati",
            reset_btn: "Reset",
            close_btn: "Batal",
          },
        },
      },
      styles: {
        palette: {
          window: "#FFFFFF",
          windowBorder: "#CBD5E1",
          tabIcon: "#2563EB",
          menuIcons: "#64748B",
          textDark: "#0F172A",
          textLight: "#FFFFFF",
          link: "#2563EB",
          action: "#2563EB",
          inactiveTabIcon: "#94A3B8",
          error: "#EF4444",
          inProgress: "#3B82F6",
          complete: "#10B981",
          sourceBg: "#F8FAFC",
        },
      },
    },
    (error, result) => {
      if (error) {
        console.error("Cloudinary widget error:", error)
        if (onError) onError(error)
        return
      }

      if (result && result.event === "success") {
        const info = result.info
        let croppedUrl = info.secure_url

        // Cloudinary Upload Widget menyimpan area crop sebagai koordinat (custom coordinates).
        // Agar yang tersimpan dan tampil adalah HASIL CROP bukan foto asli yang uncropped:
        // Kita terapkan transformasi c_crop,g_custom pada URL pengiriman Cloudinary.
        if (info.coordinates && info.coordinates.custom && info.coordinates.custom.length > 0) {
          const [cropX, cropY, cropW, cropH] = info.coordinates.custom[0]
          // Gunakan koordinat spesifik c_crop,x_...,y_...,w_...,h_... agar 100% presisi sesuai pilihan user
          croppedUrl = info.secure_url.replace(
            "/upload/",
            `/upload/c_crop,x_${cropX},y_${cropY},w_${cropW},h_${cropH}/`
          )
        } else {
          // Fallback: gunakan gravity custom otomatis
          croppedUrl = info.secure_url.replace("/upload/", "/upload/c_crop,g_custom/")
        }

        if (onSuccess) onSuccess(croppedUrl, info)
      } else if (result && result.event === "close") {
        if (onClose) onClose()
      }
    }
  )

  widget.open()
}

/**
 * Kompresi gambar di sisi klien (Canvas) agar proses upload cepat & hemat kuota Cloudinary Free Tier
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {number} quality (0 to 1)
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Gagal mengompresi gambar."))
            }
          },
          "image/jpeg",
          quality
        )
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

/**
 * Direct REST fallback jika widget tidak terbuka
 */
export async function uploadToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || "ephsphyt"
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || "lmsernawaty"

  // 1. Validasi tipe file harus berupa gambar
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!file || !file.type || !validTypes.includes(file.type.toLowerCase())) {
    throw new Error("File tidak valid. Hanya file gambar (JPG, PNG, atau WEBP) yang diizinkan.")
  }

  // 2. Validasi ukuran maksimal 2MB (2 * 1024 * 1024 bytes)
  const MAX_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error("Ukuran file terlalu besar! Maksimal ukuran gambar adalah 2MB.")
  }

  const compressedBlob = await compressImage(file, 600, 600, 0.85)

  const fd = new FormData()
  fd.append("file", compressedBlob, "avatar.jpg")
  fd.append("upload_preset", uploadPreset)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  })

  const resData = await res.json()
  if (!res.ok) {
    throw new Error(resData?.error?.message || "Gagal mengunggah foto.")
  }

  return resData.secure_url
}
