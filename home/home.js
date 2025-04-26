// Khai báo biến toàn cục để lưu sản phẩm đang chỉnh sửa
let currentEditProduct = null;
let currentId = 1; // Khởi tạo ID bắt đầu từ 1
let lastSearchTerm = ''; // Lưu từ khóa tìm kiếm cuối cùng

// Khởi tạo Firebase
let db;
function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK không được tải. Vui lòng kiểm tra lại file HTML và script Firebase.");
        return;
    }
    const firebaseConfig = {
        apiKey: "AIzaSyD8I5hLFV7E2oNl5ZVA_ZQMyNqmUTrfwlk",
        authDomain: "myextensionsync.firebaseapp.com",
        databaseURL: "https://myextensionsync-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "myextensionsync",
        storageBucket: "myextensionsync.firebasestorage.app",
        messagingSenderId: "489073226857",
        appId: "1:489073226857:web:58f011fdf25dbbb6885ef8",
        measurementId: "G-TGZLB7Y1NP"
    };
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database(app);
}

document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo Firebase
    initializeFirebase();
    // Thực hiện hành động khi HTML được tải xong
    console.log("Nội dung HTML đã được tải xong!");
    // Tăng số lần trang mở
    incrementPageOpenCount();
    // Hiển thị sản phẩm khi tải trang
    displayProducts();
    // Khởi tạo dữ liệu mẫu
    initializeSampleProducts();
});

// Hàm khởi tạo dữ liệu mẫu
function initializeSampleProducts() {
    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        const productList = snapshot.val();
        if (!productList) {
            // Nếu chưa có dữ liệu, khởi tạo dữ liệu mẫu
            const sampleProducts = [
                { id: 1, maTim: "SP001", tenHienThi: "Áo thun nam", donGia: 150, hethang: false },
                { id: 2, maTim: "SP002", tenHienThi: "Quần jeans nữ", donGia: 300, hethang: true }
            ];
            productListRef.set(sampleProducts, (error) => {
                if (error) {
                    console.error("Lỗi khi lưu dữ liệu mẫu lên Firebase:", error);
                } else {
                    console.log("Đã khởi tạo dữ liệu mẫu trên Firebase");
                }
            });
        }
    });
}

function incrementPageOpenCount() {
    const pageOpenCountInput = document.getElementById('pageOpenCount');
    let count = parseInt(localStorage.getItem('pageOpenCount')) || 0;
    count++;
    pageOpenCountInput.value = count;
    localStorage.setItem('pageOpenCount', count);
    console.log("Số lần mở : " + count);
}

document.querySelector('.home-icon').addEventListener('click', function() {
    const homeWidth = 700;
    const homeHeight = 800;
    chrome.windows.create({
        url: chrome.runtime.getURL("order/order.html"),
        type: "popup",
        width: homeWidth,
        height: homeHeight,
        top: Math.round((screen.height - homeHeight) / 2),
        left: Math.round((screen.width - homeWidth) / 2)
    }, function() {
        window.close();
    });
});

// Hàm hiển thị dữ liệu sản phẩm từ Firebase
function displayProducts(searchTerm = '') {
    const table = document.getElementById("customers");
    const rows = table.getElementsByTagName("tr");

    // Xóa các hàng dữ liệu (giữ lại hàng tiêu đề)
    for (let i = rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }

    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        let productList = snapshot.val() || [];
        let filteredProducts = productList;

        // Nếu có từ khóa tìm kiếm, lọc sản phẩm
        if (searchTerm) {
            filteredProducts = searchProducts(searchTerm, productList);
        }

        // Hiển thị danh sách sản phẩm (đã lọc hoặc toàn bộ)
        filteredProducts.forEach((product, index) => {
            const newRow = table.insertRow();
            newRow.insertCell(0).innerText = product.id; // Hiển thị ID
            newRow.insertCell(1).innerText = product.maTim;
            newRow.insertCell(2).innerText = product.tenHienThi;
            newRow.insertCell(3).innerText = product.donGia;

            const deleteCell = newRow.insertCell(4);
            const deleteButton = document.createElement("button");
            deleteButton.innerText = "Xóa";
            deleteButton.className = "button-xoa";
            deleteCell.appendChild(deleteButton);

            const statusCell = newRow.insertCell(5);
            const statusButton = document.createElement("button");
            statusButton.innerText = product.hethang ? "Hết" : "Còn";
            statusButton.className = product.hethang ? "button-het" : "button-con";
            statusCell.appendChild(statusButton);

            // Thêm sự kiện click để sửa dữ liệu
            newRow.addEventListener("click", () => {
                document.getElementById("id-sanpham").value = product.id;
                document.getElementById("ma-tim").value = product.maTim;
                document.getElementById("ten-hien-thi").value = product.tenHienThi;
                document.getElementById("don-gia").value = product.donGia;
                currentEditProduct = { ...product, index }; // Lưu sản phẩm hiện tại để sửa
            });

            // Xóa sản phẩm
            deleteButton.addEventListener("click", (event) => {
                event.stopPropagation();
                removeProduct(index);
                displayProducts(lastSearchTerm);
            });

            // Chuyển đổi trạng thái hết hàng
            statusButton.addEventListener("click", (event) => {
                event.stopPropagation();
                toggleHethang(index);
            });
        });

        // Cập nhật currentId cho sản phẩm tiếp theo
        currentId = Math.max(...(productList.map(p => p.id) || [0]), 0) + 1;
    });
}

// Hàm đảo ngược trạng thái hethang
function toggleHethang(index) {
    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        let productList = snapshot.val() || [];
        productList[index].hethang = !productList[index].hethang;
        productListRef.set(productList, (error) => {
            if (error) {
                console.error("Lỗi khi cập nhật trạng thái hethang trên Firebase:", error);
            } else {
                console.log("Đã cập nhật trạng thái hethang trên Firebase");
                displayProducts(lastSearchTerm);
            }
        });
    });
}

// Hàm tìm kiếm sản phẩm
function searchProducts(searchTerm, productList) {
    const keywords = searchTerm.toLowerCase().trim().split(/\s+/);
    return productList.filter(product => {
        const maTim = product.maTim.toLowerCase();
        const tenHienThi = product.tenHienThi.toLowerCase();
        const donGia = String(product.donGia).toLowerCase();
        const hethang = product.hethang ? "hết" : "còn";
        return keywords.every(keyword => 
            maTim.includes(keyword) ||
            tenHienThi.includes(keyword) ||
            donGia.includes(keyword) ||
            hethang.includes(keyword)
        );
    });
}

function showSizeSelector() {
    const sizeContainer = document.querySelector('.size-container');
    sizeContainer.classList.add('show');
}

function cancelSizeSelection() {
    const sizeContainer = document.querySelector('.size-container');
    const checkboxes = document.querySelectorAll('.size-product input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    sizeContainer.classList.remove('show');
}

document.getElementById("cancel-size").addEventListener("click", cancelSizeSelection);

function addProduct() {
    const maTim = document.getElementById("ma-tim").value.trim().toUpperCase();
    const tenHienThi = document.getElementById("ten-hien-thi").value.trim();
    const donGia = document.getElementById("don-gia").value.trim();
    const id = currentId;

    if (!maTim || !tenHienThi || !donGia) {
        alert("Vui lòng điền đầy đủ thông tin sản phẩm.");
        return;
    }

    showSizeSelector();

    const confirmButton = document.getElementById("confirm-size");
    confirmButton.onclick = function() {
        const selectedSizes = Array.from(document.querySelectorAll('.size-product input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
        
        if (selectedSizes.length === 0) {
            alert("Vui lòng chọn ít nhất một kích thước.");
            return;
        }

        const newProducts = selectedSizes.map(size => ({
            id: currentId++,
            maTim: `${maTim}-${size}`,
            tenHienThi: `${maTim} ${tenHienThi} ${size}`,
            donGia,
            hethang: false
        }));

        const productListRef = db.ref('productList');
        productListRef.once('value', (snapshot) => {
            let productList = snapshot.val() || [];
            productList.push(...newProducts);
            productListRef.set(productList, (error) => {
                if (error) {
                    console.error("Lỗi khi thêm sản phẩm lên Firebase:", error);
                } else {
                    console.log("Đã thêm sản phẩm lên Firebase");
                    displayProducts(lastSearchTerm);
                }
            });
        });

        clearInputs();
        const sizeContainer = document.querySelector('.size-container');
        sizeContainer.classList.remove('show');
    };
}

function updateProduct() {
    const id = document.getElementById("id-sanpham").value.trim();
    const maTim = document.getElementById("ma-tim").value.trim();
    const tenHienThi = document.getElementById("ten-hien-thi").value.trim();
    const donGia = document.getElementById("don-gia").value.trim();

    if (!id || !maTim || !tenHienThi || !donGia) {
        alert("Vui lòng điền đầy đủ thông tin sản phẩm.");
        return;
    }

    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        let productList = snapshot.val() || [];
        const index = productList.findIndex(product => product.id == id);

        if (index === -1) {
            alert("Chưa tồn tại sản phẩm với ID này.");
            return;
        }

        productList[index] = {
            ...productList[index],
            maTim,
            tenHienThi,
            donGia,
            id: parseInt(id)
        };

        productListRef.set(productList, (error) => {
            if (error) {
                console.error("Lỗi khi cập nhật sản phẩm trên Firebase:", error);
            } else {
                console.log("Đã cập nhật sản phẩm trên Firebase");
                displayProducts(lastSearchTerm);
            }
        });
    });

    clearInputs();
}

function removeProduct(index) {
    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        let productList = snapshot.val() || [];
        productList.splice(index, 1);
        productListRef.set(productList, (error) => {
            if (error) {
                console.error("Lỗi khi xóa sản phẩm trên Firebase:", error);
            } else {
                console.log("Đã xóa sản phẩm trên Firebase");
                displayProducts(lastSearchTerm);
            }
        });
    });
}

document.querySelector(".button-xoatoanbo").addEventListener("click", () => {
    const confirmDelete = confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không?");
    if (confirmDelete) {
        clearAllProducts();
    }
});

function clearAllProducts() {
    const productListRef = db.ref('productList');
    productListRef.set([], (error) => {
        if (error) {
            console.error("Lỗi khi xóa toàn bộ sản phẩm trên Firebase:", error);
        } else {
            console.log("Đã xóa toàn bộ sản phẩm trên Firebase");
            displayProducts(lastSearchTerm);
            alert("Đã xóa toàn bộ dữ liệu.");
        }
    });
}

function clearInputs() {
    document.getElementById("id-sanpham").value = "";
    document.getElementById("ma-tim").value = "";
    document.getElementById("ten-hien-thi").value = "";
    document.getElementById("don-gia").value = "";
}

document.querySelector(".button-them").addEventListener("click", addProduct);
document.querySelector(".button-sua").addEventListener("click", updateProduct);

// Excel
document.querySelector('.button-nhapex').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        alert('Vui lòng chọn một tệp Excel để tải lên.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const productListRef = db.ref('productList');
        productListRef.once('value', (snapshot) => {
            let productList = snapshot.val() || [];

            const newProducts = jsonData.slice(1).map(row => ({
                id: currentId++,
                maTim: row[0] ? row[0].toUpperCase() : '',
                tenHienThi: row[1],
                donGia: row[2],
                hethang: row[3] === "Hết" || row[3] === true
            })).filter(product => product.maTim && product.tenHienThi && product.donGia);

            productList.push(...newProducts);
            productListRef.set(productList, (error) => {
                if (error) {
                    console.error("Lỗi khi nhập sản phẩm từ Excel lên Firebase:", error);
                } else {
                    console.log("Đã nhập sản phẩm từ Excel lên Firebase");
                    displayProducts(lastSearchTerm);
                }
            });
        });
    };
    reader.readAsArrayBuffer(file);
});

document.querySelector('.button-taiex').addEventListener('click', downloadExcelFile);

function downloadExcelFile() {
    const productListRef = db.ref('productList');
    productListRef.once('value', (snapshot) => {
        const productList = snapshot.val() || [];
        const excelData = [["Mã tìm", "Tên hiển thị", "Giá", "Trạng Thái"]];
        productList.forEach(product => {
            excelData.push([product.maTim, product.tenHienThi, product.donGia, product.hethang ? "Hết" : "Còn"]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách sản phẩm");

        const now = new Date();
        const formattedDate = `${now.getHours()}h_${now.getMinutes()}m_${now.getDate()}d_${now.getMonth() + 1}m_${now.getFullYear()}y`;
        XLSX.writeFile(workbook, `Danh_sach_san_pham_${formattedDate}.xlsx`);
    });
}

document.querySelector('input[name="search"]').addEventListener('input', function (event) {
    lastSearchTerm = event.target.value.toLowerCase();
    displayProducts(lastSearchTerm);
});