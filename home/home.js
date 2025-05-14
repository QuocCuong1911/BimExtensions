let currentEditProduct = null;
let currentId = 1;
let lastSearchTerm = '';
let db;

function initializeFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyD8I5hLFV7E2oNl5ZVA_ZQMyNqmUTrfwlk",
        authDomain: "myextensionsync.firebaseapp.com",
        projectId: "myextensionsync",
        storageBucket: "myextensionsync.firebasestorage.app",
        messagingSenderId: "489073226857",
        appId: "1:489073226857:web:58f011fdf25dbbb6885ef8",
        measurementId: "G-TGZLB7Y1NP"
    };
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(app);
}

document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    console.log("Nội dung HTML đã được tải xong!");
    incrementPageOpenCount();
    displayProducts();
});

function incrementPageOpenCount() {
    const pageOpenCountInput = document.getElementById('pageOpenCount');
    let count = parseInt(localStorage.getItem('pageOpenCount')) || 0;
    count++;
    pageOpenCountInput.value = count;
    localStorage.setItem('pageOpenCount', count);
    console.log("Số lần mở: " + count);
}

document.querySelector('.home-icon').addEventListener('click', function() {
    const homeWidth = 700;
    const homeHeight = 820;
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

// Hàm cập nhật lastModified trong metadata/productList
function updateLastModified() {
    const metadataRef = db.collection('metadata').doc('productList');
    const currentTime = new Date().toISOString();
    
    return metadataRef.set({
        lastModified: currentTime
    }, { merge: true }).then(() => {
        console.log(`Đã cập nhật lastModified: ${currentTime}`);
    }).catch(error => {
        console.error("Lỗi khi cập nhật lastModified:", error);
    });
}

function displayProducts(searchTerm = '') {
    const table = document.getElementById("customers");
    const rows = table.getElementsByTagName("tr");

    // Xóa các hàng cũ
    for (let i = rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }

    // Hiển thị loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang tải dữ liệu sản phẩm, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    const productListRef = db.collection('productList');
    productListRef.get().then((snapshot) => {
        let productList = [];
        snapshot.forEach(doc => {
            productList.push({ ...doc.data(), docId: doc.id });
        });

        let filteredProducts = productList;
        if (searchTerm) {
            filteredProducts = searchProducts(searchTerm, productList);
        }

        filteredProducts.sort((a, b) => a.id - b.id);
        filteredProducts.forEach((product, index) => {
            const newRow = table.insertRow();
            newRow.insertCell(0).innerText = product.id;
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

            newRow.addEventListener("click", () => {
                document.getElementById("id-sanpham").value = product.id;
                document.getElementById("ma-tim").value = product.maTim;
                document.getElementById("ten-hien-thi").value = product.tenHienThi;
                document.getElementById("don-gia").value = product.donGia;
                currentEditProduct = { ...product, index };
            });

            deleteButton.addEventListener("click", (event) => {
                event.stopPropagation();
                removeProduct(product.docId);
            });

            statusButton.addEventListener("click", (event) => {
                event.stopPropagation();
                toggleHethang(product.docId);
            });
        });

        currentId = productList.length > 0 ? Math.max(...productList.map(p => p.id)) + 1 : 1;

        // Ẩn loading overlay khi hoàn tất
        loadingOverlay.style.display = 'none';
    }).catch(error => {
        console.error("Lỗi khi lấy dữ liệu từ Firestore:", error);
        loadingOverlay.style.display = 'none';
        alert("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.");
    });
}

// Thêm sự kiện cho nút "Làm mới"
document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refresh-products');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            displayProducts(lastSearchTerm);
        });
    }
});

function toggleHethang(docId) {
    const productRef = db.collection('productList').doc(docId);
    productRef.get().then(doc => {
        if (doc.exists) {
            const product = doc.data();
            productRef.update({
                hethang: !product.hethang
            }).then(() => {
                console.log("Đã cập nhật trạng thái hethang trên Firestore");
                // Cập nhật lastModified sau khi thay đổi
                return updateLastModified();
            }).then(() => {
                displayProducts(lastSearchTerm); // Gọi lại để cập nhật giao diện
            }).catch(error => {
                console.error("Lỗi khi cập nhật trạng thái hethang trên Firestore:", error);
            });
        }
    }).catch(error => {
        console.error("Lỗi khi lấy dữ liệu từ Firestore:", error);
    });
}

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
            donGia: parseInt(donGia),
            hethang: false
        }));

        const batch = db.batch();
        newProducts.forEach(product => {
            const docRef = db.collection('productList').doc(product.id.toString());
            batch.set(docRef, product);
        });

        batch.commit().then(() => {
            console.log("Đã thêm sản phẩm lên Firestore");
            // Cập nhật lastModified sau khi thêm sản phẩm
            return updateLastModified();
        }).then(() => {
            displayProducts(lastSearchTerm);
        }).catch(error => {
            console.error("Lỗi khi thêm sản phẩm lên Firestore:", error);
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

    const productRef = db.collection('productList').doc(id);
    productRef.get().then(doc => {
        if (!doc.exists) {
            alert("Chưa tồn tại sản phẩm với ID này.");
            return;
        }

        productRef.update({
            maTim,
            tenHienThi,
            donGia: parseInt(donGia),
            id: parseInt(id)
        }).then(() => {
            console.log("Đã cập nhật sản phẩm trên Firestore");
            // Cập nhật lastModified sau khi sửa sản phẩm
            return updateLastModified();
        }).then(() => {
            displayProducts(lastSearchTerm);
        }).catch(error => {
            console.error("Lỗi khi cập nhật sản phẩm trên Firestore:", error);
        });
    });

    clearInputs();
}

function removeProduct(docId) {
    db.collection('productList').doc(docId).delete().then(() => {
        console.log("Đã xóa sản phẩm trên Firestore");
        // Cập nhật lastModified sau khi xóa sản phẩm
        return updateLastModified();
    }).then(() => {
        displayProducts(lastSearchTerm);
    }).catch(error => {
        console.error("Lỗi khi xóa sản phẩm trên Firestore:", error);
    });
}

document.querySelector(".button-xoatoanbo").addEventListener("click", () => {
    const confirmDelete = confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không?");
    if (confirmDelete) {
        clearAllProducts(confirmDelete);
    }
});

function clearAllProducts(confirmDelete) {
    if (!confirmDelete) return;

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang xóa toàn bộ sản phẩm, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    const productListRef = db.collection('productList');
    productListRef.get().then(snapshot => {
        if (snapshot.empty) {
            loadingOverlay.style.display = 'none';
            alert("Không có sản phẩm nào để xóa.");
            return;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.commit().then(() => {
            console.log("Đã xóa toàn bộ sản phẩm trên Firestore");
            // Cập nhật lastModified sau khi xóa toàn bộ
            return updateLastModified();
        }).then(() => {
            displayProducts(lastSearchTerm);
            loadingOverlay.style.display = 'none';
            alert("Đã xóa toàn bộ dữ liệu.");
        }).catch(error => {
            console.error("Lỗi khi xóa toàn bộ sản phẩm trên Firestore:", error);
            loadingOverlay.style.display = 'none';
            alert("Có lỗi xảy ra khi xóa dữ liệu. Vui lòng thử lại.");
        });
    }).catch(error => {
        console.error("Lỗi khi truy vấn productList trên Firestore:", error);
        loadingOverlay.style.display = 'none';
        alert("Có lỗi xảy ra khi truy vấn dữ liệu. Vui lòng thử lại.");
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

document.querySelector('.button-nhapex').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        alert('Vui lòng chọn một tệp Excel để tải lên.');
        return;
    }

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang tải sản phẩm lên, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const batch = db.batch();
            jsonData.slice(1).forEach(row => {
                const product = {
                    id: currentId++,
                    maTim: row[0] ? row[0].toUpperCase() : '',
                    tenHienThi: row[1],
                    donGia: row[2],
                    hethang: row[3] === "Hết" || row[3] === true
                };
                if (product.maTim && product.tenHienThi && product.donGia) {
                    const docRef = db.collection('productList').doc(product.id.toString());
                    batch.set(docRef, product);
                }
            });

            batch.commit().then(() => {
                console.log("Đã nhập sản phẩm từ Excel lên Firestore");
                // Cập nhật lastModified sau khi nhập từ Excel
                return updateLastModified();
            }).then(() => {
                displayProducts(lastSearchTerm);
                loadingOverlay.style.display = 'none';
            }).catch(error => {
                console.error("Lỗi khi nhập sản phẩm từ Excel lên Firestore:", error);
                loadingOverlay.style.display = 'none';
                alert('Có lỗi xảy ra khi nhập dữ liệu. Vui lòng thử lại.');
            });
        } catch (error) {
            console.error("Lỗi khi đọc file Excel:", error);
            loadingOverlay.style.display = 'none';
            alert('Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra file và thử lại.');
        }
    };
    reader.onerror = (error) => {
        console.error("Lỗi khi đọc file:", error);
        loadingOverlay.style.display = 'none';
        alert('Không thể đọc file. Vui lòng thử lại.');
    };
    reader.readAsArrayBuffer(file);
});

document.querySelector('.button-taiex').addEventListener('click', downloadExcelFile);

function downloadExcelFile() {
    const productListRef = db.collection('productList');

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang chuẩn bị dữ liệu, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    productListRef.get().then(snapshot => {
        const productList = [];
        snapshot.forEach(doc => {
            productList.push(doc.data());
        });

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

        // Tắt loading overlay sau khi tải file
        loadingOverlay.style.display = 'none';
    }).catch(error => {
        console.error("Lỗi khi lấy dữ liệu từ Firestore:", error);
        // Tắt loading overlay nếu có lỗi
        loadingOverlay.style.display = 'none';
        alert("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.");
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

document.querySelector('input[name="search"]').addEventListener('input', debounce(function (event) {
    lastSearchTerm = event.target.value.toLowerCase();
    displayProducts(lastSearchTerm);
}, 400));