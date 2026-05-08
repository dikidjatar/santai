# Pengenalan

**Santai** adalah bahasa pemrograman dengan sintaks berbahasa Indonesia. Dirancang agar mudah dibaca dan ditulis, Santai memungkinkan kamu menulis kode dengan kata-kata yang terasa natural dalam bahasa sehari-hari.

# Instalasi

## Persyaratan

- **Node.js** versi 18 atau yang lebih baru dengan npm yang sudah terinstal

### Instal via npm

```bash
npm install -g santai-lang
```

Setelah instal verifikasi dengan `santai --version`

## Menjalankan file

```bash
santai -e "spil 'Halo Dunia!'"
santai --eval "spil 'Halo Dunia!'"
```

## Variabel Lingkungan

| Variabel               | Keterangan                            |
| :--------------------- | :------------------------------------ |
| `SANTAI_DEBUG=1`       | Aktifkan output diagnostik internal   |
| `SANTAI_MAX_ERRORS=n`  | Batas maksimum error sebelum berhenti |
| `SANTAI_STACK_LIMIT=n` | Batas kedalaman call stack            |
| `NO_COLOR=1`           | Nonaktifkan warna ANSI di output      |
