let db;
let productList = [];
let orderHistory = [];

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK không được tải. Vui lòng kiểm tra lại file HTML và script Firebase.");
        return;
    }
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
    // Thiết lập onSnapshot cho metadata/productList
    setupMetadataListener();
}

// Hàm thiết lập onSnapshot cho metadata/productList
function setupMetadataListener() {
    const metadataRef = db.collection('metadata').doc('productList');
    unsubscribeMetadata = metadataRef.onSnapshot(doc => {
        const firestoreLastModified = doc.exists ? doc.data().lastModified : null;
        const storedData = JSON.parse(localStorage.getItem('productList')) || { data: [], lastModified: null };
        const localLastModified = storedData.lastModified;

        const notificationDot = document.querySelector('.notification-dot');
        // Chỉ hiển thị thông báo nếu không phải người đang thực hiện thay đổi
        if (!isUpdating && firestoreLastModified && localLastModified !== firestoreLastModified) {
            notificationDot.classList.add('visible');
            showtoastnew("Dữ liệu sản phẩm đã được cập nhật. Nhấn nút tải để làm mới!", "info");
        } else {
            notificationDot.classList.remove('visible');
        }
    }, error => {
        console.error("Lỗi khi lắng nghe metadata từ Firestore:", error);
        showtoastnew("Lỗi khi kiểm tra cập nhật dữ liệu!", "error");
    });
}

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

function loadProductList() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang kiểm tra dữ liệu sản phẩm, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    const storedData = JSON.parse(localStorage.getItem('productList')) || { data: [], lastModified: null };
    const localLastModified = storedData.lastModified;

    const metadataRef = db.collection('metadata').doc('productList');
    metadataRef.get().then(doc => {
        const firestoreLastModified = doc.exists ? doc.data().lastModified : null;

        if (localLastModified && firestoreLastModified && localLastModified === firestoreLastModified) {
            productList = storedData.data;
            productList.sort((a, b) => a.id - b.id);
            loadingOverlay.style.display = 'none';
            document.querySelector('.notification-dot').classList.remove('visible'); // Ẩn notification-dot
        } else {
            loadingMessage.textContent = 'Đang cập nhật dữ liệu sản phẩm, vui lòng chờ...';
            const productListRef = db.collection('productList');
            productListRef.get().then(snapshot => {
                productList = [];
                snapshot.forEach(doc => {
                    productList.push({ ...doc.data(), docId: doc.id });
                });
                productList.sort((a, b) => a.id - b.id);

                localStorage.setItem('productList', JSON.stringify({
                    data: productList,
                    lastModified: firestoreLastModified || new Date().toISOString()
                }));

                loadingOverlay.style.display = 'none';
                document.querySelector('.notification-dot').classList.remove('visible'); // Ẩn notification-dot
            }).catch(error => {
                console.error("Lỗi khi tải productList từ Firestore:", error);
                loadingOverlay.style.display = 'none';
                showtoastnew("Lỗi khi tải dữ liệu sản phẩm!", "error");
            });
        }
    }).catch(error => {
        console.error("Lỗi khi lấy lastModified từ Firestore:", error);
        loadingOverlay.style.display = 'none';
        showtoastnew("Lỗi khi kiểm tra dữ liệu!", "error");
    });
}

function loadOrderHistory() {
    const orderHistoryRef = db.collection('orderHistory');
    orderHistoryRef.onSnapshot((snapshot) => {
        orderHistory = [];
        snapshot.forEach(doc => {
            orderHistory.push({ ...doc.data(), docId: doc.id });
        });
    }, error => {
        console.error("Lỗi khi tải orderHistory từ Firestore:", error);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    initializeFirebase();
    loadProductList();
    loadOrderHistory();
    cleanOldOrders();
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.focus();
    }
    console.log("Nội dung HTML đã được tải xong!");
    incrementPageOpenCount();

    // Thêm sự kiện cho download-button
    document.querySelector('.download-button').addEventListener('click', () => {
        const notificationDot = document.querySelector('.notification-dot');
        if (notificationDot.classList.contains('visible')) {
            loadProductList(); // Gọi lại để tải dữ liệu mới
        } else {
            showtoastnew("Dữ liệu đã là mới nhất!", "info");
        }
    });
    // Thêm sự kiện cho checkbox "CK"
    document.getElementById("check-24").addEventListener("change", function () {
        updateTotals(); // Cập nhật tổng tiền khi checkbox thay đổi
    });
});

// Hủy onSnapshot khi rời trang
window.addEventListener('unload', () => {
    if (unsubscribeMetadata) {
        unsubscribeMetadata();
        console.log("Đã hủy onSnapshot cho metadata/productList");
    }
});

function incrementPageOpenCount() {
    const pageOpenCountInput = document.getElementById('pageOpenCount2');
    let count = parseInt(localStorage.getItem('pageOpenCount2')) || 0;
    count++;
    pageOpenCountInput.value = count;
    localStorage.setItem('pageOpenCount2', count);
    console.log("Số lần mở : " + count);
}

document.querySelector('.reset-icon').addEventListener('click', function () {
    const listProducts = document.querySelector('.list-products');
    if (listProducts) {
        while (listProducts.firstChild) {
            listProducts.removeChild(listProducts.firstChild);
        }
        const totalProductInput = document.getElementById('total-product-item');
        const totalPriceInput = document.getElementById('total-price-item');
        const voucherInput = document.getElementById('voucher-item');
        const discountInput = document.getElementById('discount-item');
        if (totalProductInput) totalProductInput.value = 0;
        if (totalPriceInput) totalPriceInput.value = 0;
        if (voucherInput) voucherInput.value = 0;
        if (discountInput) discountInput.value = 0;
    }
});

function updateAllProductStatuses(productName, newHethangStatus) {
    const allProducts = document.querySelectorAll('.product-order');
    allProducts.forEach(productLi => {
        const currentProductName = productLi.querySelector('.product-name').value.trim();
        if (currentProductName === productName) {
            const statusIcon = productLi.querySelector('.status-icon');
            const iconElement = statusIcon.querySelector('i');
            iconElement.classList.remove('fa-circle-check', 'fa-exclamation-circle');
            iconElement.classList.add(newHethangStatus ? 'fa-exclamation-circle' : 'fa-circle-check');
            const productNameInput = productLi.querySelector('.product-name');
            productNameInput.classList.toggle('out-of-stock', newHethangStatus);
        }
    });
}

let isUpdating = false; // Cờ để đánh dấu người dùng đang thực hiện thay đổi

function toggleHethang(productName, liElement) {
    if (isUpdating) return; // Ngăn cập nhật đồng thời
    isUpdating = true;

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-content p');
    loadingMessage.textContent = 'Đang cập nhật trạng thái sản phẩm, vui lòng chờ...';
    loadingOverlay.style.display = 'flex';

    const product = productList.find(p => p.tenHienThi === productName);
    if (product) {
        const newHethangStatus = !product.hethang;
        const productRef = db.collection('productList').doc(product.docId);
        productRef.update({ hethang: newHethangStatus }).then(() => {
            console.log(`Đã cập nhật trạng thái hethang cho sản phẩm ${productName}`);
            return updateLastModified();
        }).then(() => {
            return db.collection('metadata').doc('productList').get();
        }).then(doc => {
            const newLastModified = doc.exists ? doc.data().lastModified : new Date().toISOString();
            product.hethang = newHethangStatus;
            localStorage.setItem('productList', JSON.stringify({
                data: productList,
                lastModified: newLastModified
            }));
            updateAllProductStatuses(productName, newHethangStatus);
            loadingOverlay.style.display = 'none';
            showtoastnew(`Đã cập nhật trạng thái ${newHethangStatus ? 'hết hàng' : 'còn hàng'} cho ${productName}`, "success");
            isUpdating = false; // Đặt cờ về false sau khi hoàn tất
        }).catch(error => {
            console.error("Lỗi khi cập nhật hethang trên Firestore:", error);
            loadingOverlay.style.display = 'none';
            showtoastnew("Lỗi khi cập nhật trạng thái sản phẩm!", "error");
            isUpdating = false; // Đặt cờ về false nếu có lỗi
        });
    } else {
        loadingOverlay.style.display = 'none';
        showtoastnew(`Sản phẩm "${productName}" không tồn tại!`, "warning");
        isUpdating = false;
    }
}

document.querySelector('.add-button').addEventListener('click', function () {
    const newProduct = document.createElement('li');
    newProduct.classList.add('product-order');
    newProduct.innerHTML = `
        <div class="product-item">
            <span class="status-icon"><i class="fa-solid fa-circle-check"></i></span>
            <input type="text" placeholder="Tên sản phẩm" class="product-name">
            <input class="price-product" min="0" value="1" placeholder="giá" type="number">
            <input class="quantity" value="1" min="1" placeholder="SL" type="number">
            <button class="delete-product">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    const productList = document.querySelector('.list-products');
    productList.appendChild(newProduct);
    newProduct.querySelector(".quantity").addEventListener("input", updateTotals);
    newProduct.querySelector(".price-product").addEventListener("input", updateTotals);
    newProduct.querySelector('.delete-product').addEventListener('click', function () {
        newProduct.remove();
        updateTotals();
    });
    newProduct.querySelector('.status-icon').addEventListener('click', () => {
        const productName = newProduct.querySelector('.product-name').value.trim();
        if (productName) {
            toggleHethang(productName, newProduct);
        }
    });
    // newProduct.querySelector('.product-name').addEventListener('input', function () {
    //     const productName = this.value.trim();
    //     if (productName) {
    //         const product = productList.find(p => p.tenHienThi === productName);
    //         if (product) {
    //             const statusIcon = newProduct.querySelector('.status-icon');
    //             const iconElement = statusIcon.querySelector('i');
    //             iconElement.classList.remove('fa-circle-check', 'fa-exclamation-circle');
    //             iconElement.classList.add(product.hethang ? 'fa-exclamation-circle' : 'fa-circle-check');
    //             newProduct.querySelector('.product-name').classList.toggle('out-of-stock', product.hethang);
    //         }
    //     }
    // });
    updateTotals();
});

document.querySelector('.home-icon').addEventListener('click', function () {
    const homeWidth = 800;
    const homeHeight = 900;
    chrome.windows.create({
        url: chrome.runtime.getURL("home/home.html"),
        type: "popup",
        width: homeWidth,
        height: homeHeight,
        top: Math.round((screen.height - homeHeight) / 2),
        left: Math.round((screen.width - homeWidth) / 2)
    }, function () {
        window.close();
    });
});

document.querySelector(".search-bar-order input").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const suggestionsContainer = document.querySelector(".suggestions");
    suggestionsContainer.innerHTML = "";
    if (!query) {
        suggestionsContainer.style.display = "none";
        return;
    }
    const queryTerms = query.split(" ").filter(term => term.trim() !== "");
    const filteredProducts = productList.filter(product => {
        return queryTerms.every(term => {
            return (
                product.maTim.toLowerCase().includes(term) ||
                product.tenHienThi.toLowerCase().includes(term) ||
                product.donGia.toString().includes(term)
            );
        });
    });
    if (filteredProducts.length > 0) {
        filteredProducts.slice(0, 10).forEach(product => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className = "suggestion-item";
            if (product.hethang) {
                suggestionItem.classList.add("out-of-stock");
            }
            suggestionItem.innerText = product.tenHienThi;
            suggestionItem.addEventListener("click", () => {
                const newLi = document.createElement("li");
                newLi.className = "product-order";
                const iconClass = product.hethang ? 'fa-exclamation-circle' : 'fa-circle-check';
                newLi.innerHTML = `
                    <div class="product-item">
                        <span class="status-icon"><i class="fa-solid ${iconClass}"></i></span>
                        <input type="text" value="${product.tenHienThi}" class="product-name${product.hethang ? ' out-of-stock' : ''}"/>
                        <input class="price-product" min="0" value="${product.donGia}" type="number" />
                        <input class="quantity" value="1" min="1" type="number" />
                        <button class="delete-product">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
                const productList = document.querySelector(".list-products");
                if (productList) {
                    productList.appendChild(newLi);
                    newLi.querySelector(".quantity").addEventListener("input", updateTotals);
                    newLi.querySelector(".price-product").addEventListener("input", updateTotals);
                    newLi.querySelector(".delete-product").addEventListener("click", (event) => {
                        event.stopPropagation();
                        newLi.remove();
                        updateTotals();
                    });
                    newLi.querySelector('.status-icon').addEventListener('click', () => {
                        toggleHethang(product.tenHienThi, newLi);
                    });
                }
                updateTotals();
                suggestionsContainer.innerHTML = "";
                suggestionsContainer.style.display = "none";
            });
            suggestionsContainer.appendChild(suggestionItem);
            const separator = document.createElement("div");
            separator.className = "separator";
            suggestionsContainer.appendChild(separator);
        });
        suggestionsContainer.style.display = "block";
    } else {
        suggestionsContainer.style.display = "none";
    }
});

document.querySelector(".list-products").addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-product")) {
        const productOrderItem = event.target.closest(".product-order");
        if (productOrderItem) {
            productOrderItem.remove();
            console.log("Removed product from list");
            updateTotals();
        }
    }
});

function updateTotals() {
    let totalQuantity = 0;
    let totalPrice = 0;
    document.querySelectorAll(".product-order").forEach(product => {
        let priceString = product.querySelector(".price-product").value;
        let quantity = parseInt(product.querySelector(".quantity").value) || 0;
        let price = parseFloat(priceString);
        console.log("Original Price String:", priceString, "Parsed Price:", price, "Quantity:", quantity);
        if (!isNaN(price)) {
            totalQuantity += quantity;
            totalPrice += price * quantity;
        }
    });
    const voucherValue = parseFloat(document.getElementById("voucher-item").value) || 0;
    const discountValue = parseFloat(document.getElementById("discount-item").value) || 0;
    let shippingFee = 0;
    document.querySelectorAll("input[name='phi-ship']").forEach(option => {
        if (option.checked) {
            shippingFee = parseFloat(option.value);
        }
    });
    totalPrice -= voucherValue;
    totalPrice -= discountValue;
    totalPrice += shippingFee;
    totalPrice = Math.max(totalPrice, 0);

    // Kiểm tra trạng thái checkbox "CK"
    const isTransferChecked = document.getElementById("check-24").checked;
    if (isTransferChecked) {
        totalPrice = 0; // Đặt tổng tiền về 0 khi checkbox "CK" được chọn
    }

    document.getElementById("total-product-item").value = totalQuantity;
    document.getElementById("total-price-item").value = totalPrice.toFixed(0) + 'K';
}

document.getElementById("voucher-item").addEventListener("input", updateTotals);
document.getElementById("discount-item").addEventListener("input", updateTotals);
document.querySelectorAll("input[name='phi-ship']").forEach(radio => {
    radio.addEventListener("change", updateTotals);
});
document.querySelector(".list-products").addEventListener("input", function (event) {
    if (event.target.classList.contains("quantity") || event.target.classList.contains("price-product")) {
        updateTotals();
    }
});

const showtoastnew = (message, type = "info") => {
    const notifications = document.querySelector(".notifications");
    const toastnew = document.createElement("li");
    toastnew.className = `toastnew ${type}`;
    let iconClass = "fa-info-circle";
    if (type === "success") iconClass = "fa-circle-check";
    else if (type === "error") iconClass = "fa-circle-xmark";
    else if (type === "warning") iconClass = "fa-triangle-exclamation";
    toastnew.innerHTML = `
        <div class="column">
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        </div>
        <i class="fa-solid fa-xmark"></i>
    `;
    notifications.appendChild(toastnew);
    const closeButton = toastnew.querySelector('.fa-xmark');
    closeButton.addEventListener('click', () => removetoastnew(toastnew));
    setTimeout(() => removetoastnew(toastnew), 5000);
};

const removetoastnew = (toast) => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 500);
};

document.querySelector('.create-btn').addEventListener('click', function () {
    const products = document.querySelectorAll('.product-order');
    if (products.length === 0) {
        showtoastnew("Không có sản phẩm nào để lên đơn!", "error");
        return;
    }
    let productText = "";
    let totalExpression = "";
    let totalAmount = 0;
    const shipFee = parseFloat(document.querySelector("input[name='phi-ship']:checked").value) || 0;
    const voucher = parseFloat(document.getElementById("voucher-item").value) || 0;
    const discount = parseFloat(document.getElementById("discount-item").value) || 0;
    let hasNonZeroPrice = false;

    products.forEach((product) => {
        const name = product.querySelector('.product-name').value;
        const priceString = product.querySelector('.price-product').value;
        const price = parseFloat(priceString) || 0;
        const quantity = parseInt(product.querySelector('.quantity').value) || 1;
        const productTotal = price * quantity;
        totalAmount += productTotal;
        if (price > 0) {
            hasNonZeroPrice = true;
            if (quantity > 1) {
                productText += `${name} ${price} ${quantity} cái\n`;
                totalExpression += `${price}+`.repeat(quantity);
            } else {
                productText += `${name} ${price}\n`;
                totalExpression += `${price}+`;
            }
        } else {
            productText += `${name}\n`;
        }
    });

    totalExpression = totalExpression.slice(0, -1);
    if (shipFee > 0 && hasNonZeroPrice) totalExpression += `+${shipFee}ship`;
    else if (shipFee > 0 && !hasNonZeroPrice) totalExpression += `${shipFee}ship`;
    if (voucher > 0) totalExpression += `-${voucher}(voucher)`;
    if (discount > 0) totalExpression += `-${discount}( )`;
    
    let finalTotal = totalAmount + shipFee - voucher - discount;
    finalTotal = Math.max(finalTotal, 0);

    const isTransferChecked = document.getElementById("check-24").checked;
    if (isTransferChecked) {
        finalTotal = 0;
    }

    let finalText = `Dạ em lên đơn cho mình ạ\n${productText}`;

    // Điều chỉnh cách hiển thị TC
    if (isTransferChecked && products.length === 1 && products[0].querySelector('.quantity').value === "1" && shipFee === 0 && voucher === 0 && discount === 0 && !hasNonZeroPrice) {
        finalText += `TC : 0K`; // Trường hợp 1 sản phẩm, số lượng 1, tất cả giá = 0
    } else if (isTransferChecked && finalTotal === 0 && !hasNonZeroPrice) {
        finalText += `TC : 0K`; // Trường hợp CK và tổng = 0, không có giá trị nào khác 0
    } else if (products.length === 1 && shipFee === 0 && voucher === 0 && discount === 0 && !isTransferChecked) {
        finalText += `TC : ${totalAmount}K`; // Trường hợp 1 sản phẩm, không CK
    } else {
        finalText += `TC : ${totalExpression} = ${finalTotal}K`; // Hiển thị công thức nếu có giá trị khác 0
    }

    if (isTransferChecked) {
        if (shipFee === 0) {
            finalText += " (CHUYỂN KHOẢN, miễn ship)";
        } else {
            finalText += " (CHUYỂN KHOẢN)";
        }
    } else {
        if (shipFee === 0) finalText += " (miễn ship)";
    }

    finalText += " ạ";
    navigator.clipboard.writeText(finalText).then(() => {
        showtoastnew("Đoạn văn bản đã được sao chép vào bộ nhớ tạm.", "success");
    }).catch(err => {
        showtoastnew("Không thể sao chép vào bộ nhớ tạm.", "error");
        console.error("Không thể sao chép vào bộ nhớ tạm:", err);
    });
    saveOrderToStorage(products);
});

function saveOrderToStorage(products) {
    const sdtInput = document.getElementById("customer-sdt");
    if (!sdtInput) {
        console.error("Không tìm thấy ô nhập SDT!");
        showtoastnew("Lỗi: Không tìm thấy ô nhập SDT!", "error");
        return;
    }

    const sdt = sdtInput.value.trim();
    if (!sdt) {
        console.log("Chưa nhập SDT, không lưu đơn hàng vào Firestore");
        showtoastnew("Vui lòng nhập số điện thoại!", "warning");
        return;
    }

    const voucher = parseFloat(document.getElementById("voucher-item").value) || 0;
    const discount = parseFloat(document.getElementById("discount-item").value) || 0;
    const shipFee = parseFloat(document.querySelector("input[name='phi-ship']:checked").value) || 0;
    const isTransfer = document.getElementById("check-24").checked; // Lấy trạng thái checkbox "CK"

    const newOrder = {
        sdt: sdt,
        products: Array.from(products).map(product => ({
            name: product.querySelector('.product-name').value,
            price: parseFloat(product.querySelector('.price-product').value) || 0,
            quantity: parseInt(product.querySelector('.quantity').value) || 1
        })),
        voucher: voucher,
        discount: discount,
        shipFee: shipFee,
        isTransfer: isTransfer, // Thêm trường isTransfer
        orderTime: new Date().toISOString()
    };

    const orderHistoryRef = db.collection('orderHistory');
    orderHistoryRef.where('sdt', '==', sdt).limit(1).get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                // SDT đã tồn tại, cập nhật đơn hàng hiện có
                const doc = snapshot.docs[0];
                orderHistoryRef.doc(doc.id).set(newOrder, { merge: true })
                    .then(() => {
                        console.log(`Đã cập nhật đơn hàng cho SDT ${sdt}:`, newOrder);
                        showtoastnew(`Cập nhật đơn hàng thành công cho SDT ${sdt}`, "success");
                    })
                    .catch(error => {
                        console.error("Lỗi khi cập nhật đơn hàng:", error);
                        showtoastnew("Lỗi khi cập nhật đơn hàng!", "error");
                    });
            } else {
                // SDT chưa tồn tại, thêm đơn hàng mới
                orderHistoryRef.doc().set(newOrder)
                    .then(() => {
                        console.log(`Đã lưu đơn hàng mới cho SDT ${sdt}:`, newOrder);
                        showtoastnew(`Lưu đơn hàng mới thành công cho SDT ${sdt}`, "success");
                    })
                    .catch(error => {
                        console.error("Lỗi khi lưu đơn hàng mới:", error);
                        showtoastnew("Lỗi khi lưu đơn hàng mới!", "error");
                    });
            }
        })
        .catch(error => {
            console.error("Lỗi khi kiểm tra SDT:", error);
            showtoastnew("Lỗi khi kiểm tra số điện thoại!", "error");
        });
}

document.getElementById("customer-sdt").addEventListener("input", function () {
    const query = this.value.trim();
    const suggestionsDiv = document.getElementById("sdt-suggestions");
    suggestionsDiv.innerHTML = "";
    if (!query) {
        suggestionsDiv.style.display = "none";
        return;
    }
    const matchingOrders = orderHistory
        .filter(order => order.sdt.includes(query))
        .slice(0, 10);
    if (matchingOrders.length > 0) {
        matchingOrders.forEach(order => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className = "suggestion-item";
            suggestionItem.textContent = order.sdt;
            suggestionItem.addEventListener("click", () => {
                document.getElementById("customer-sdt").value = order.sdt;
                loadOrder(order);
                suggestionsDiv.innerHTML = "";
                suggestionsDiv.style.display = "none";
            });
            suggestionsDiv.appendChild(suggestionItem);
        });
        suggestionsDiv.style.display = "block";
    } else {
        suggestionsDiv.style.display = "none";
    }
});

function loadOrder(order) {
    const listProducts = document.querySelector(".list-products");
    listProducts.innerHTML = "";
    order.products.forEach(prod => {
        const li = document.createElement("li");
        li.className = "product-order";
        const product = productList.find(p => p.tenHienThi === prod.name);
        const hethang = product ? product.hethang : false;
        const iconClass = hethang ? 'fa-exclamation-circle' : 'fa-circle-check';
        li.innerHTML = `
            <div class="product-item">
                <span class="status-icon"><i class="fa-solid ${iconClass}"></i></span>
                <input type="text" value="${prod.name}" class="product-name${hethang ? ' out-of-stock' : ''}" />
                <input type="number" min="0" value="${prod.price}" class="price-product" placeholder="giá" />
                <input type="number" min="1" value="${prod.quantity}" class="quantity" placeholder="SL" />
                <button class="delete-product">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        li.querySelector(".quantity").addEventListener("input", updateTotals);
        li.querySelector(".price-product").addEventListener("input", updateTotals);
        li.querySelector('.delete-product').addEventListener('click', function () {
            li.remove();
            updateTotals();
        });
        li.querySelector('.status-icon').addEventListener('click', () => {
            const productName = li.querySelector('.product-name').value.trim();
            if (productName) {
                toggleHethang(productName, li);
            }
        });
        listProducts.appendChild(li);
    });
    document.getElementById("voucher-item").value = order.voucher || 0;
    document.getElementById("discount-item").value = order.discount || 0;
    const shipOptions = document.querySelectorAll("input[name='phi-ship']");
    shipOptions.forEach(option => {
        if (parseFloat(option.value) === order.shipFee) {
            option.checked = true;
        }
    });
    // Tự động chọn checkbox "CK" nếu đơn hàng có isTransfer = true
    const checkBox = document.getElementById("check-24");
    if (checkBox) {
        checkBox.checked = order.isTransfer || false;
    }
    updateTotals();
}

function cleanOldOrders() {
    const orderHistoryRef = db.collection('orderHistory');
    orderHistoryRef.get().then((snapshot) => {
        const now = new Date();
        const batch = db.batch();
        let deletedCount = 0;

        snapshot.forEach(doc => {
            const order = doc.data();
            if (!order.orderTime) {
                batch.delete(doc.ref);
                deletedCount++;
                return;
            }

            const orderDate = new Date(order.orderTime);
            const diffInMs = now - orderDate;
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

            // Xác định số ngày cần giữ dựa trên số lượng sản phẩm
            const productCount = order.products ? order.products.length : 0;
            let daysToKeep = 2; // Mặc định cho ít hơn 5 sản phẩm

            if (productCount >= 7) {
                daysToKeep = 10;
            } else if (productCount >= 5) {
                daysToKeep = 5;
            }

            // Kiểm tra và xóa đơn hàng nếu vượt quá số ngày cần giữ
            if (diffInDays > daysToKeep) {
                batch.delete(doc.ref);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            batch.commit().then(() => {
                console.log(`Đã xóa ${deletedCount} đơn hàng cũ.`);
            }).catch(error => {
                console.error("Lỗi khi xóa đơn hàng cũ trên Firestore:", error);
            });
        } else {
            console.log("Không có đơn hàng nào cần xóa.");
        }
    }).catch(error => {
        console.error("Lỗi khi truy vấn orderHistory trên Firestore:", error);
    });
}