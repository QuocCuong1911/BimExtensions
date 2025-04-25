document.addEventListener("DOMContentLoaded", function () {
    cleanOldOrders();
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.focus();
    }
    console.log("Nội dung HTML đã được tải xong!");
    incrementPageOpenCount();
});

function incrementPageOpenCount() {
    const pageOpenCountInput = document.getElementById('pageOpenCount2');
    let count = parseInt(localStorage.getItem('pageOpenCount2')) || 0;
    count++;
    pageOpenCountInput.value = count;
    localStorage.setItem('pageOpenCount2', count);
    console.log("Số lần mở : " + count);
}

// Reset danh sách sản phẩm
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

// Hàm đồng bộ trạng thái hethang cho tất cả sản phẩm có cùng tên
function updateAllProductStatuses(productName, newHethangStatus) {
    const allProducts = document.querySelectorAll('.product-order');
    allProducts.forEach(productLi => {
        const currentProductName = productLi.querySelector('.product-name').value.trim();
        if (currentProductName === productName) {
            const statusIcon = productLi.querySelector('.status-icon');
            const iconElement = statusIcon.querySelector('i'); // Lấy thẻ <i> bên trong
            iconElement.classList.remove('fa-circle-check', 'fa-exclamation-circle');
            iconElement.classList.add(newHethangStatus ? 'fa-exclamation-circle' : 'fa-circle-check');
            const productNameInput = productLi.querySelector('.product-name');
            productNameInput.classList.toggle('out-of-stock', newHethangStatus);
        }
    });
}

// Hàm đảo ngược trạng thái hethang
function toggleHethang(productName, liElement) {
    chrome.storage.local.get(['productList'], (result) => {
        let productList = result.productList || [];
        const productIndex = productList.findIndex(p => p.tenHienThi === productName);
        if (productIndex !== -1) {
            // Đảo ngược trạng thái hethang
            productList[productIndex].hethang = !productList[productIndex].hethang;
            // Lưu lại productList
            chrome.storage.local.set({ productList }, () => {
                // Đồng bộ trạng thái cho tất cả sản phẩm có cùng tên
                updateAllProductStatuses(productName, productList[productIndex].hethang);
            });
        }
    });
}

// Thêm sản phẩm thủ công
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
    // Thêm sự kiện toggle cho icon
    newProduct.querySelector('.status-icon').addEventListener('click', () => {
        const productName = newProduct.querySelector('.product-name').value.trim();
        if (productName) {
            toggleHethang(productName, newProduct);
        }
    });
    // Kiểm tra trạng thái hethang khi nhập tên sản phẩm
    newProduct.querySelector('.product-name').addEventListener('input', function () {
        const productName = this.value.trim();
        if (productName) {
            chrome.storage.local.get(['productList'], (result) => {
                let productList = result.productList || [];
                const product = productList.find(p => p.tenHienThi === productName);
                if (product) {
                    const statusIcon = newProduct.querySelector('.status-icon');
                    const iconElement = statusIcon.querySelector('i'); // Lấy thẻ <i> bên trong
                    iconElement.classList.remove('fa-circle-check', 'fa-exclamation-circle');
                    iconElement.classList.add(product.hethang ? 'fa-exclamation-circle' : 'fa-circle-check');
                    newProduct.querySelector('.product-name').classList.toggle('out-of-stock', product.hethang);
                }
            });
        }
    });
    updateTotals();
});

// Chuyển về trang chủ
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

// Tìm kiếm sản phẩm
document.querySelector(".search-bar-order input").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const suggestionsContainer = document.querySelector(".suggestions");
    suggestionsContainer.innerHTML = "";
    if (!query) {
        suggestionsContainer.style.display = "none";
        return;
    }
    chrome.storage.local.get("productList", (data) => {
        if (data.productList) {
            const queryTerms = query.split(" ").filter(term => term.trim() !== "");
            const filteredProducts = data.productList.filter(product => {
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
                            // Thêm sự kiện toggle cho icon
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
        }
    });
});

// Xóa sản phẩm
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

// Tính toán tổng
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
    document.getElementById("total-product-item").value = totalQuantity;
    document.getElementById("total-price-item").value = totalPrice.toFixed(0) + 'K';
}

// Sự kiện cho voucher, giảm giá, phí ship
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

// Thông báo toast
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

// Tạo đơn hàng
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
    products.forEach((product) => {
        const name = product.querySelector('.product-name').value;
        const priceString = product.querySelector('.price-product').value;
        const price = parseFloat(priceString) || 0;
        const quantity = parseInt(product.querySelector('.quantity').value) || 1;
        const productTotal = price * quantity;
        totalAmount += productTotal;
        if (price > 0) {
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
    if (shipFee > 0) totalExpression += `+${shipFee}ship`;
    if (voucher > 0) totalExpression += `-${voucher}(voucher)`;
    if (discount > 0) totalExpression += `-${discount}( )`;
    let finalTotal = totalAmount + shipFee - voucher - discount;
    if (products.length === 1 && shipFee === 0 && voucher === 0 && discount === 0) {
        totalExpression = `${totalAmount}`;
        finalTotal = totalAmount;
    }
    let finalText = `Dạ em lên đơn cho mình ạ\n${productText}`;
    if (products.length === 1 && shipFee === 0 && voucher === 0 && discount === 0) {
        finalText += `TC : ${totalAmount}K`;
    } else {
        finalText += `TC : ${totalExpression} = ${finalTotal}K`;
    }
    if (shipFee === 0) finalText += " (miễn ship)";
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
        return;
    }
    const sdt = sdtInput.value.trim();
    if (!sdt) {
        console.log("Chưa nhập SDT, không lưu đơn hàng vào storage");
        return;
    }
    const voucher = parseFloat(document.getElementById("voucher-item").value) || 0;
    const discount = parseFloat(document.getElementById("discount-item").value) || 0;
    const shipFee = parseFloat(document.querySelector("input[name='phi-ship']:checked").value) || 0;
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
        orderTime: new Date().toISOString()
    };
    chrome.storage.local.get("orderHistory", (data) => {
        let orderHistory = data.orderHistory || [];
        const existingOrderIndex = orderHistory.findIndex(order => order.sdt === sdt);
        if (existingOrderIndex !== -1) {
            orderHistory[existingOrderIndex] = newOrder;
        } else {
            orderHistory.push(newOrder);
        }
        chrome.storage.local.set({ orderHistory: orderHistory }, () => {
            console.log("Đơn hàng đã được lưu/cập nhật:", newOrder);
        });
    });
}

// Tìm kiếm SDT
document.getElementById("customer-sdt").addEventListener("input", function () {
    const query = this.value.trim();
    const suggestionsDiv = document.getElementById("sdt-suggestions");
    suggestionsDiv.innerHTML = "";
    if (!query) {
        suggestionsDiv.style.display = "none";
        return;
    }
    chrome.storage.local.get("orderHistory", (data) => {
        const orderHistory = data.orderHistory || [];
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
});

// Nạp đơn hàng cũ
function loadOrder(order) {
    const listProducts = document.querySelector(".list-products");
    listProducts.innerHTML = "";
    chrome.storage.local.get(['productList'], (result) => {
        let productList = result.productList || [];
        order.products.forEach(prod => {
            const li = document.createElement("li");
            li.className = "product-order";
            // Kiểm tra trạng thái hethang từ productList
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
            // Thêm sự kiện toggle cho icon
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
        updateTotals();
    });
}

function cleanOldOrders() {
    chrome.storage.local.get("orderHistory", (data) => {
        let orderHistory = data.orderHistory || [];
        const now = new Date();
        const filteredOrders = orderHistory.filter(order => {
            if (!order.orderTime) return false;
            const orderDate = new Date(order.orderTime);
            const diffInMs = now - orderDate;
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            return diffInDays <= 2;
        });
        if (filteredOrders.length !== orderHistory.length) {
            chrome.storage.local.set({ orderHistory: filteredOrders }, () => {
                console.log("Đã xóa các đơn hàng cũ hơn 2 ngày. Số đơn hàng còn lại:", filteredOrders.length);
            });
        } else {
            console.log("Không có đơn hàng nào quá 2 ngày để xóa.");
        }
    });
}