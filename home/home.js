// Khai báo biến toàn cục để lưu sản phẩm đang chỉnh sửa
let currentEditProduct = null;
let currentId = 1; // Khởi tạo ID bắt đầu từ 1

document.querySelector('.home-icon').addEventListener('click', function() {
    const homeWidth = 700;  // Độ rộng cho home
    const homeHeight = 800;  // Độ cao cho home

    chrome.windows.create({
        url: chrome.runtime.getURL("order/order.html"),
        type: "popup",
        width: homeWidth,
        height: homeHeight,
        top: Math.round((screen.height - homeHeight) / 2),  // Căn giữa theo chiều dọc
        left: Math.round((screen.width - homeWidth) / 2)    // Căn giữa theo chiều ngang
    }, function() {
        // Đóng trang order sau khi mở trang home
        window.close();
    });
});

// Hàm hiển thị dữ liệu sản phẩm từ local storage
function displayProducts() {
    chrome.storage.local.get("productList", (data) => {
        const table = document.getElementById("customers");
        const rows = table.getElementsByTagName("tr");

        // Xóa các hàng dữ liệu (giữ lại hàng tiêu đề)
        for (let i = rows.length - 1; i > 0; i--) {
            table.deleteRow(i);
        }

        // Nếu có dữ liệu, hiển thị từng sản phẩm
        if (data.productList) {
            data.productList.forEach(product => {
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

                // Thêm sự kiện click để sửa dữ liệu
                newRow.addEventListener("click", () => {
                    document.getElementById("id-sanpham").value = product.id; // Hiển thị ID
                    document.getElementById("ma-tim").value = product.maTim;
                    document.getElementById("ten-hien-thi").value = product.tenHienThi;
                    document.getElementById("don-gia").value = product.donGia;
                    currentEditProduct = product; // Lưu sản phẩm hiện tại để sửa
                });

                // Xóa sản phẩm khỏi storage và giao diện khi nhấn nút "Xóa"
                deleteButton.addEventListener("click", (event) => {
                    event.stopPropagation(); // Ngăn chặn sự kiện click trên dòng
                    removeProduct(product.id); // Xóa theo ID
                    displayProducts(); // Cập nhật lại bảng
                });
            });
            currentId = data.productList.length + 1; // Cập nhật ID cho sản phẩm tiếp theo
        }
    });
}

function showSizeSelector() {
    const sizeContainer = document.querySelector('.size-container');
    sizeContainer.classList.add('show'); // Hiển thị phần chọn kích thước
}

function cancelSizeSelection() {
    const sizeContainer = document.querySelector('.size-container');
    const checkboxes = document.querySelectorAll('.size-product input[type="checkbox"]');
    
    // Bỏ chọn tất cả các checkbox
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Ẩn phần chọn kích thước
    sizeContainer.classList.remove('show');
}

document.getElementById("cancel-size").addEventListener("click", cancelSizeSelection);

function addProduct() {
    const maTim = document.getElementById("ma-tim").value.trim().toUpperCase();
    const tenHienThi = document.getElementById("ten-hien-thi").value.trim();
    const donGia = document.getElementById("don-gia").value.trim();
    const id = currentId; // Lấy ID hiện tại

    // Kiểm tra nếu các trường không bị bỏ trống
    if (!maTim || !tenHienThi || !donGia) {
        alert("Vui lòng điền đầy đủ thông tin sản phẩm.");
        return;
    }

    // Hiện phần chọn kích thước
    showSizeSelector();

    // Lắng nghe sự kiện cho nút xác nhận trong phần chọn kích thước
    const confirmButton = document.getElementById("confirm-size"); // Nút xác nhận
    confirmButton.onclick = function() {
        const selectedSizes = Array.from(document.querySelectorAll('.size-product input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
        
        if (selectedSizes.length === 0) {
            alert("Vui lòng chọn ít nhất một kích thước.");
            return;
        }

        // Danh sách sản phẩm mới
        const newProducts = selectedSizes.map(size => ({
            id: currentId++, // Tăng ID
            maTim: `${maTim}-${size}`, // Thêm size vào mã tìm
            tenHienThi: `${maTim} ${tenHienThi} ${size}`, // Nối mã tìm vào tên hiển thị với size
            donGia
        }));

        // Lưu sản phẩm mới vào danh sách
        chrome.storage.local.get("productList", (data) => {
            const productList = data.productList || [];
            productList.push(...newProducts); // Thêm nhiều sản phẩm vào danh sách
            chrome.storage.local.set({ productList }, () => {
                displayProducts(); // Cập nhật bảng
            });
        });

        // Xóa dữ liệu trong ô input sau khi thêm
        clearInputs();
        
        // Ẩn phần chọn kích thước
        const sizeContainer = document.querySelector('.size-container');
        sizeContainer.classList.remove('show');
    };
}
document.querySelector(".button-them").addEventListener("click", addProduct);



// Hàm sửa sản phẩm
function updateProduct() {
    const id = document.getElementById("id-sanpham").value.trim();
    const maTim = document.getElementById("ma-tim").value.trim();
    const tenHienThi = document.getElementById("ten-hien-thi").value.trim();
    const donGia = document.getElementById("don-gia").value.trim();

    // Kiểm tra nếu các trường không bị bỏ trống
    if (!id || !maTim || !tenHienThi || !donGia) {
        alert("Vui lòng điền đầy đủ thông tin sản phẩm.");
        return;
    }

    // Kiểm tra nếu ID tồn tại
    chrome.storage.local.get("productList", (data) => {
        const productList = data.productList || [];
        const existingProduct = productList.find(product => product.id == id); // Tìm sản phẩm theo ID

        if (!existingProduct) {
            alert("Chưa tồn tại sản phẩm với ID này.");
            return;
        }

        // Cập nhật thông tin sản phẩm
        existingProduct.maTim = maTim;
        existingProduct.tenHienThi = tenHienThi;
        existingProduct.donGia = donGia;

        chrome.storage.local.set({ productList }, () => {
            displayProducts(); // Cập nhật bảng
        });

        // Xóa dữ liệu trong ô input sau khi sửa
        clearInputs();
    });
}

// Hàm xóa sản phẩm
function removeProduct(id) {
    chrome.storage.local.get("productList", (data) => {
        const productList = data.productList || [];
        const updatedProductList = productList.filter(product => product.id != id); // Xóa theo ID

        chrome.storage.local.set({ productList: updatedProductList }, () => {
            displayProducts(); // Cập nhật bảng
        });
    });
}

// Lắng nghe sự kiện khi nhấn nút "Xóa Toàn bộ"
document.querySelector(".button-xoatoanbo").addEventListener("click", () => {
    const confirmDelete = confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không?");

    if (confirmDelete) {
        // Gọi hàm xóa toàn bộ dữ liệu
        clearAllProducts();
    }
});

// Hàm xóa toàn bộ sản phẩm
function clearAllProducts() {
    chrome.storage.local.set({ productList: [] }, () => {
        displayProducts(); // Cập nhật bảng
        alert("Đã xóa toàn bộ dữ liệu."); // Thông báo đã xóa thành công
    });
}

// Hàm xóa dữ liệu trong ô input
function clearInputs() {
    document.getElementById("id-sanpham").value = "";
    document.getElementById("ma-tim").value = "";
    document.getElementById("ten-hien-thi").value = "";
    document.getElementById("don-gia").value = "";
}

function showSizeSelector() {
    const sizeContainer = document.querySelector('.size-container');
    sizeContainer.classList.add('show'); // Hiển thị phần chọn kích thước
}

// Lắng nghe sự kiện khi nhấn nút "Thêm"
document.querySelector(".button-them").addEventListener("click", addProduct);
// Lắng nghe sự kiện khi nhấn nút "Sửa"
document.querySelector(".button-sua").addEventListener("click", updateProduct);

// Tải dữ liệu khi mở trang
document.addEventListener("DOMContentLoaded", displayProducts);

// Excel
document.querySelector('.button-nhapex').addEventListener('click', () => {
    document.getElementById('file-input').click(); // Kích hoạt phần input file
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

        // Chuyển đổi dữ liệu sang định dạng mà bạn cần, bỏ qua dòng tiêu đề
        const productList = jsonData.slice(1).map(row => ({
            id: currentId++, // Tạo ID tự động
            maTim: row[0] ? row[0].toUpperCase() : '', // Cột A
            tenHienThi: row[1], // Cột B
            donGia: row[2] // Cột C
        })).filter(product => product.maTim && product.tenHienThi && product.donGia); // Bỏ qua các sản phẩm không hợp lệ

        // Lưu sản phẩm vào local storage
        chrome.storage.local.get("productList", (data) => {
            const existingProducts = data.productList || [];
            const updatedProducts = existingProducts.concat(productList);
            chrome.storage.local.set({ productList: updatedProducts }, () => {
                displayProducts(); // Cập nhật bảng
            });
        });
    };

    reader.readAsArrayBuffer(file);
});


// Lắng nghe sự kiện khi nhấn nút "Tải Excel"
document.querySelector('.button-taiex').addEventListener('click', downloadExcelFile);

// Hàm tải xuống file Excel
function downloadExcelFile() {
    // Lấy dữ liệu từ local storage
    chrome.storage.local.get("productList", (data) => {
        const productList = data.productList || [];

        // Chuyển đổi dữ liệu thành định dạng 2D array cho Excel
        const excelData = [["Mã tìm", "Tên hiển thị", "Giá"]]; // Tiêu đề cột
        productList.forEach(product => {
            excelData.push([product.maTim, product.tenHienThi, product.donGia]);
        });

        // Tạo workbook và worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách sản phẩm");

        // Xuất file Excel
        XLSX.writeFile(workbook, "Danh_sach_san_pham.xlsx");
    });
}

// Lắng nghe sự kiện nhập vào thanh tìm kiếm
document.querySelector('input[name="search"]').addEventListener('input', function (event) {
    const searchTerm = event.target.value.toLowerCase(); // Lấy giá trị nhập vào

    if (searchTerm === "") {
        // Nếu không có ký tự nào, hiển thị tất cả sản phẩm
        displayProducts();
    } else {
        // Nếu có ký tự, gọi hàm tìm kiếm
        searchProducts(searchTerm);
    }
});

// Hàm tìm kiếm sản phẩm
function searchProducts(searchTerm) {
    // Lấy dữ liệu sản phẩm từ local storage
    chrome.storage.local.get("productList", (data) => {
        const table = document.getElementById("customers");
        const rows = table.getElementsByTagName("tr");

        // Xóa các hàng dữ liệu (giữ lại hàng tiêu đề)
        for (let i = rows.length - 1; i > 0; i--) {
            table.deleteRow(i);
        }

        // Nếu không có từ khóa tìm kiếm, hiển thị toàn bộ sản phẩm
        if (!searchTerm) {
            displayProducts(); // Gọi hàm để hiển thị tất cả sản phẩm
            return; // Kết thúc hàm
        }

        // Nếu có dữ liệu, hiển thị các sản phẩm tìm thấy
        if (data.productList) {
            const filteredProducts = data.productList.filter(product => {
                const maTimMatch = product.maTim.toLowerCase().includes(searchTerm);
                const tenHienThiMatch = product.tenHienThi.toLowerCase().includes(searchTerm);
                const donGiaMatch = String(product.donGia).toLowerCase().includes(searchTerm); // Chuyển đổi donGia thành chuỗi

                return maTimMatch || tenHienThiMatch || donGiaMatch; // Tìm kiếm theo mã tìm, tên hiển thị hoặc giá
            });

            filteredProducts.forEach(product => {
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

                // Thêm sự kiện click để sửa dữ liệu
                newRow.addEventListener("click", () => {
                    document.getElementById("id-sanpham").value = product.id; // Hiển thị ID
                    document.getElementById("ma-tim").value = product.maTim;
                    document.getElementById("ten-hien-thi").value = product.tenHienThi;
                    document.getElementById("don-gia").value = product.donGia;
                    currentEditProduct = product; // Lưu sản phẩm hiện tại để sửa
                });

                // Xóa sản phẩm khỏi storage và giao diện khi nhấn nút "Xóa"
                deleteButton.addEventListener("click", (event) => {
                    event.stopPropagation(); // Ngăn chặn sự kiện click trên dòng
                    removeProduct(product.id); // Xóa theo ID
                    displayProducts(); // Cập nhật lại bảng
                });
            });
        }
    });
}

