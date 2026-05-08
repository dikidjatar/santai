# Variabel

Santai memiliki dua cara untuk mendeklarasikan variabel: titip (dapat diubah) dan isi (tidak dapat diubah).

---

## Variabel dengan `titip`

Gunakan titip untuk variabel yang nilainya bisa berubah.

```santai
titip nama = 'Tilly'
titip umur = 26

# Mengubah variabel
umur = 21
nama = 'Stamet'
```

## Variabel dengan `isi`

Gunakan `isi` untuk nilai yang tidak boleh berubah setelah dideklarasikan. Wajib diinisialisasi langsung.

```santai
isi PI = 3.14159

PI = 3.0 # akan error seperti berikut:
# 😤 MasalahSintaks[S0015]: 'PI' nilainya tetap — gak bisa diubah-ubah!
#    ┌─ testing/skrip.santai:3:1
#    │
#  3 │ PI = 3.0 # akan error seperti berikut:
#    │ ^^ di sini
#    │
#    = saran: kalau butuh nilai yang bisa diubah, pake 'titip' bukan 'isi'
```

## Deklarasi Banyak Sekaligus

Beberapa variabel bisa dideklarasikan sekaligus dengan koma

```santai
titip x = 1, y = 2, z = 3
isi a = 'a', b = 'b'
```

## Tanpa Nilai Awal

Variabel `titip` bisa dideklarasikan tanpa nilai awal (nilainya menjadi kosong):

```santai
titip hasil # hasil = kosong
spil hasil # koong

hasil = 10
spil hasi # 10
```

## Aturan Penamaan

- Bisa menggunakan huruf, angka, dan garis bawah `_`
- Harus diawali dengan huruf atau `_`
- Bersifat case-sensitive: `Nama` dan `nama` adalah dua variabel berbeda
- Tidak boleh menggunakan kata kunci Santai sebagai nama variabel

```santai
isi _nilai = 100
isi nama_depan = "Budi"
isi nilai2 = 99
```
