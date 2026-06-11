/* 1. Pengaturan Data Utama & Local Storage */
// Ambil data yang tersimpan atau buat array kosong kalau belum ada data
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Setel tema dasar (default ke mode terang)
let currentTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", currentTheme);

// Variabel untuk menyimpan grafik Chart.js agar bisa di-update otomatis
let expenseChart = null;

// Batas maksimal untuk memicu peringatan anggaran berlebih
const BUDGET_LIMIT = 100;

/* 2. Mengambil Elemen HTML (DOM) */
const transactionForm = document.getElementById("transaction-form");
const itemNameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const totalBalanceDisplay = document.getElementById("total-balance");
const transactionList = document.getElementById("transaction-list");
const sortSelect = document.getElementById("sort-select");
const themeToggleBtn = document.getElementById("theme-toggle");

/* 3. Fungsi Utama untuk Hitung dan Tampilan */

// Fungsi menghitung total saldo keseluruhan
function updateTotalBalance() {
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  // Menampilkan angka dengan format dua desimal di belakang koma
  totalBalanceDisplay.textContent = `$${total.toFixed(2)}`;
}

// Fungsi untuk menampilkan daftar pengeluaran ke layar
function renderTransactions() {
  // Bersihkan sisa daftar lama sebelum membuat daftar baru
  transactionList.innerHTML = "";

  // Duplikat array agar urutan asli tidak berantakan saat disortir
  let sortedTransactions = [...transactions];

  // Aturan penyortiran data
  const sortValue = sortSelect.value;
  if (sortValue === "highest") {
    sortedTransactions.sort((a, b) => b.amount - a.amount);
  } else if (sortValue === "lowest") {
    sortedTransactions.sort((a, b) => a.amount - b.amount);
  } else {
    // Urutan bawaan: menampilkan data terbaru di paling atas
    sortedTransactions.sort((a, b) => b.id - a.id);
  }

  // Membuat elemen daftar satu per satu
  sortedTransactions.forEach((item) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    // Beri tanda khusus kalau pengeluaran melewati batas budget
    if (item.amount > BUDGET_LIMIT) {
      li.classList.add("over-limit");
    }

    li.innerHTML = `
            <div class="item-info">
                <div class="item-title">${escapeHtml(item.name)}</div>
                <div class="item-cat">${item.category}</div>
            </div>
            <div class="item-amount-action">
                <span class="item-price">$${item.amount.toFixed(2)}</span>
                <button class="btn-delete" onclick="deleteTransaction(${item.id})">Delete</button>
            </div>
        `;
    transactionList.appendChild(li);
  });
}

// Fungsi untuk membuat dan memperbarui grafik lingkaran
function updateChart() {
  // Hitung total pengeluaran masing-masing kategori
  const categoryTotals = { Food: 0, Transport: 0, Fun: 0 };

  transactions.forEach((item) => {
    if (categoryTotals.hasOwnProperty(item.category)) {
      categoryTotals[item.category] += item.amount;
    }
  });

  const ctx = document.getElementById("expense-chart").getContext("2d");

  // Hapus grafik lama kalau ada, agar tidak menumpuk saat update data
  if (expenseChart !== null) {
    expenseChart.destroy();
  }

  // Konfigurasi Chart.js baru
  expenseChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Food", "Transport", "Fun"],
      datasets: [
        {
          data: [
            categoryTotals.Food,
            categoryTotals.Transport,
            categoryTotals.Fun,
          ],
          backgroundColor: ["#2ecc71", "#3498db", "#e67e22"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color:
              document.documentElement.getAttribute("data-theme") === "dark"
                ? "#ffffff"
                : "#333333",
          },
        },
      },
    },
  });
}

// Fungsi untuk menyimpan data terbaru ke LocalStorage
function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

/* 4. Validasi Form & Interaksi Tombol */

// Aksi ketika form di-submit (Tambah Transaksi Baru)
transactionForm.addEventListener("submit", function (e) {
  e.preventDefault(); // Menahan halaman agar tidak reload otomatis

  const name = itemNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  // Cek keabsahan data input sebelum diproses
  if (!name || isNaN(amount) || amount <= 0 || !category) {
    alert("Harap isi semua kolom formulir dengan nilai yang valid!");
    return;
  }

  // Membuat struktur data objek baru
  const newTransaction = {
    id: Date.now(), // Memanfaatkan waktu saat ini sebagai ID unik
    name: name,
    amount: amount,
    category: category,
  };

  // Masukkan ke daftar utama, simpan, lalu muat ulang tampilan
  transactions.push(newTransaction);
  saveData();
  init();

  // Reset kolom input form menjadi kosong kembali
  transactionForm.reset();
});

// Fungsi untuk menghapus baris transaksi berdasarkan ID-nya
window.deleteTransaction = function (id) {
  transactions = transactions.filter((item) => item.id !== id);
  saveData();
  init();
};

// Pasang efek penyortiran ketika opsi dropdown diubah
sortSelect.addEventListener("change", renderTransactions);

/* 5. Fitur Pengubah Tema (Dark & Light Mode) */
function updateToggleButtonText(theme) {
  themeToggleBtn.textContent =
    theme === "dark" ? "☀️ Mode Terang" : "🌙 Mode Gelap";
}

// Setel teks tombol di awal muat halaman sesuai tema aktif
updateToggleButtonText(currentTheme);

themeToggleBtn.addEventListener("click", () => {
  let theme = document.documentElement.getAttribute("data-theme");
  let newTheme = theme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateToggleButtonText(newTheme);

  // Ubah warna label teks pada grafik agar tetap kelihatan saat ganti tema
  if (expenseChart) {
    expenseChart.options.plugins.legend.labels.color =
      newTheme === "dark" ? "#ffffff" : "#333333";
    expenseChart.update();
  }
});

// Fungsi untuk mencegah celah keamanan XSS pada kolom input teks
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* 6. Inisialisasi Aplikasi */
function init() {
  updateTotalBalance();
  renderTransactions();
  updateChart();
}

// Jalankan fungsi inisialisasi begitu file script dimuat
init();
