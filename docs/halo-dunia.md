# Halo Dunia

Dokumentasi ini akan membantu Anda menjalankan program pertama Anda dengan cara yang paling santai namun tetap bertenaga.

### Program sederhana: Halo Dunia

Mari kita mulai dengan tradisi klasik dalam dunia pemrograman. Ikuti langkah-langkah sederhana di bawah ini:

1. Buat file bernama `halo.santai`
2. Masukkan kode berikut ke dalam file tersebut:
   ```santai
   # Program pertama saya
   spil "Halo, Dunia!"
   ```
3. Jalankan melalui terminal Anda:
   ```bash
   santai halo.santai
   ```
   Hasilnya:
   ```
   Halo, Dunia!
   ```

#### Penggunaan variabel

Di bahasa Santai kita menggunakan kata kunci titip untuk menyimpan nilai.

```santai
titip nama = "Santai"
spil "Selamat datang di bahasa {nama}!"
```

#### Mendefinisikan Aksi (Fungsi)

Kode atau program yang dapat digunakan kembali dibungkus di dalam sebuah aksi. Ini membuat kode Anda lebih rapi dan modular.

```santai
aksi sapa(nama) {
  spil "Halo, {nama}!"
}
```

#### Mengambil Input Pengguna

Buat program Anda lebih interaktif dengan menggunakan fungsi `baca` untuk menangkap masukan dari terminal.

```santai
titip nama = baca("Siapa namamu? ")
spil "Halo, " + nama + "!"
```

> **Catatan**: `spil` adalah aksi bawaan untuk mencetak ke layar. `baca` adalah aksi bawaan untuk membaca input pengguna.

> **Warning**: Pastikan ekstensi file Anda selalu menggunakan `.santai` atau `.st` agar kompilator dapat mengenali dan menjalankan skrip dengan benar.
