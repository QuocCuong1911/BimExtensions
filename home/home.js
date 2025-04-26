// Khai báo biến toàn cục để lưu sản phẩm đang chỉnh sửa
let currentEditProduct = null;
let currentId = 1; // Khởi tạo ID bắt đầu từ 1
let lastSearchTerm = ''; // Lưu từ khóa tìm kiếm cuối cùng

document.addEventListener('DOMContentLoaded', function() {
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
    chrome.storage.local.get("productList", (data) => {
        // Chỉ thêm dữ liệu mẫu nếu productList chưa tồn tại
        if (!data.productList || data.productList.length === 0) {
            const sampleProducts = [
                {
                    id: currentId++,
                    maTim: "C122-S",
                    tenHienThi: "C122 Áo trắng trơn cổ trụ S",
                    donGia: 280,
                    hethang: false
                },
                {
                    id: currentId++,
                    maTim: "C122-M",
                    tenHienThi: "C122 Áo trắng trơn cổ trụ M",
                    donGia: 280,
                    hethang: true
                },
                {
                    id: currentId++,
                    maTim: "T456-L",
                    tenHienThi: "T456 Quần jeans xanh L",
                    donGia: 450,
                    hethang: false
                },
                {
                    id: currentId++,
                    maTim: "T456-XL",
                    tenHienThi: "T456 Quần jeans xanh XL",
                    donGia: 450,
                    hethang: true
                },
                {
                    id: currentId++,
                    maTim: "S789-FR",
                    tenHienThi: "S789 Áo sơ mi caro FR",
                    donGia: 320,
                    hethang: false
                }
            ];
            chrome.storage.local.set({ productList: sampleProducts }, () => {
                console.log("Đã khởi tạo dữ liệu mẫu!");
            });
        }
    });
}

function incrementPageOpenCount() {
    // Lấy thẻ input ẩn để ghi nhận số lần mở trang
    const pageOpenCountInput = document.getElementById('pageOpenCount');

    // Lấy giá trị hiện tại từ localStorage (nếu có), hoặc bắt đầu từ 0
    let count = parseInt(localStorage.getItem('pageOpenCount')) || 0;

    // Tăng giá trị lên 1 mỗi khi trang được mở
    count++;

    // Lưu giá trị vào thẻ input ẩn
    pageOpenCountInput.value = count;

    // Lưu lại giá trị mới vào localStorage
    localStorage.setItem('pageOpenCount', count);

    console.log("Số lần mở : " + count);
}

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
function displayProducts(searchTerm = '') {
    chrome.storage.local.get("productList", (data) => {
        const table = document.getElementById("customers");
        const rows = table.getElementsByTagName("tr");

        // Xóa các hàng dữ liệu (giữ lại hàng tiêu đề)
        for (let i = rows.length - 1; i > 0; i--) {
            table.deleteRow(i);
        }

        let filteredProducts = data.productList || [];

        // Nếu có từ khóa tìm kiếm, lọc sản phẩm
        if (searchTerm) {
            filteredProducts = searchProducts(searchTerm, data.productList);
        }

        // Hiển thị danh sách sản phẩm (đã lọc hoặc toàn bộ)
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

            const statusCell = newRow.insertCell(5);
            const statusButton = document.createElement("button");
            statusButton.innerText = product.hethang ? "Hết" : "Còn";
            statusButton.className = product.hethang ? "button-het" : "button-con";
            statusCell.appendChild(statusButton);

            // Thêm sự kiện click để sửa dữ liệu
            newRow.addEventListener("click", () => {
                document.getElementById("id-sanpham").value = product.id; // Hiển thị ID
                document.getElementById("ma-tim").value = product.maTim;
                document.getElementById("ten-hien-thi").value = product.tenHienThi;
                document.getElementById("don-gia").value = product.donGia;
                currentEditProduct = product; // Lưu sản phẩm hiện tại để sửa
            });

            // Xóa sản phẩm
            deleteButton.addEventListener("click", (event) => {
                event.stopPropagation(); // Ngăn chặn sự kiện click trên dòng
                removeProduct(product.id); // Xóa theo ID
                displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
            });

            // Chuyển đổi trạng thái hết hàng
            statusButton.addEventListener("click", (event) => {
                event.stopPropagation(); // Ngăn chặn sự kiện click trên dòng
                product.hethang = !product.hethang; // Đảo trạng thái
                chrome.storage.local.set({ productList: data.productList }, () => {
                    displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
                });
            });
        });

        // Cập nhật currentId cho sản phẩm tiếp theo
        currentId = Math.max(...(data.productList || []).map(p => p.id), 0) + 1;
    });
}

// Hàm tìm kiếm sản phẩm
function searchProducts(searchTerm, productList) {
    // Tách từ khóa thành mảng các từ (loại bỏ khoảng trắng thừa)
    const keywords = searchTerm.toLowerCase().trim().split(/\s+/);
    
    return productList.filter(product => {
        // Chuyển các trường thành chuỗi và chuẩn hóa
        const maTim = product.maTim.toLowerCase();
        const tenHienThi = product.tenHienThi.toLowerCase();
        const donGia = String(product.donGia).toLowerCase();
        const hethang = product.hethang ? "hết" : "còn";

        // Kiểm tra xem tất cả từ khóa có xuất hiện trong bất kỳ trường nào không
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
            donGia,
            hethang: false // Mặc định hết hàng là false
        }));

        // Lưu sản phẩm mới vào danh sách
        chrome.storage.local.get("productList", (data) => {
            const productList = data.productList || [];
            productList.push(...newProducts); // Thêm nhiều sản phẩm vào danh sách
            chrome.storage.local.set({ productList }, () => {
                displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
            });
        });

        // Xóa dữ liệu trong ô input sau khi thêm
        clearInputs();
        
        // Ẩn phần chọn kích thước
        const sizeContainer = document.querySelector('.size-container');
        sizeContainer.classList.remove('show');
    };
}

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
        // Giữ nguyên hethang

        chrome.storage.local.set({ productList }, () => {
            displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
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
            displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
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
        displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
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

// Lắng nghe sự kiện khi nhấn nút "Thêm"
document.querySelector(".button-them").addEventListener("click", addProduct);
// Lắng nghe sự kiện khi nhấn nút "Sửa"
document.querySelector(".button-sua").addEventListener("click", updateProduct);

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
            donGia: row[2], // Cột C
            hethang: row[3] === "Hết" || row[3] === true // Cột D: Chuyển "Hết" hoặc true thành true, còn lại là false
        })).filter(product => product.maTim && product.tenHienThi && product.donGia); // Bỏ qua các sản phẩm không hợp lệ

        // Lưu sản phẩm vào local storage
        chrome.storage.local.get("productList", (data) => {
            const existingProducts = data.productList || [];
            const updatedProducts = existingProducts.concat(productList);
            chrome.storage.local.set({ productList: updatedProducts }, () => {
                displayProducts(lastSearchTerm); // Hiển thị lại danh sách đã lọc
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
        const excelData = [["Mã tìm", "Tên hiển thị", "Giá", "Trạng Thái"]]; // Tiêu đề cột
        productList.forEach(product => {
            excelData.push([product.maTim, product.tenHienThi, product.donGia, product.hethang ? "Hết" : "Còn"]);
        });

        // Tạo workbook và worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách sản phẩm");

        // Lấy ngày và giờ hiện tại
        const now = new Date();
        const formattedDate = `${now.getHours()}h_${now.getMinutes()}m_${now.getDate()}d_${now.getMonth() + 1}m_${now.getFullYear()}y`;
        
        // Xuất file Excel với tên file có chứa ngày và giờ
        XLSX.writeFile(workbook, `Danh_sach_san_pham_${formattedDate}.xlsx`);
    });
}

// Lắng nghe sự kiện nhập vào thanh tìm kiếm
document.querySelector('input[name="search"]').addEventListener('input', function (event) {
    lastSearchTerm = event.target.value.toLowerCase(); // Cập nhật từ khóa tìm kiếm
    displayProducts(lastSearchTerm); // Hiển thị danh sách đã lọc
});