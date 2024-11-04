document.addEventListener("DOMContentLoaded", function () {
    //Thêm sản phẩm order mới
    document.querySelector('.add-button').addEventListener('click', function () {
        const newProduct = document.createElement('li');
        newProduct.classList.add('product-order');
        newProduct.innerHTML = `
        <div class="product-item">
            <input type="text" placeholder="Tên sản phẩm" class="product-name">
            <input class="price-product" min="0" value="1" placeholder="giá" type="number">
            <input class="quantity" value="1" min="1" placeholder="SL" type="number">
            <button class="delete-product">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
        document.querySelector('.list-products').appendChild(newProduct);
        newProduct.querySelector(".quantity").addEventListener("input", updateTotals);
        newProduct.querySelector(".price-product").addEventListener("input", updateTotals);

        newProduct.querySelector('.delete-product').addEventListener('click', function () {
            newProduct.remove();
        });

        document.querySelector('.list-products').appendChild(newProduct);
        updateTotals();
    });

    document.querySelector('.home-icon').addEventListener('click', function () {
        const homeWidth = 800;  // Độ rộng cho home
        const homeHeight = 900;  // Độ cao cho home

        chrome.windows.create({
            url: chrome.runtime.getURL("home/home.html"),
            type: "popup",
            width: homeWidth,
            height: homeHeight,
            top: Math.round((screen.height - homeHeight) / 2),  // Căn giữa theo chiều dọc
            left: Math.round((screen.width - homeWidth) / 2)    // Căn giữa theo chiều ngang
        }, function () {
            // Đóng trang order sau khi mở trang home
            window.close();
        });
    });

    //Tìm kiếm
    // Thêm sự kiện cho ô tìm kiếm
    document.querySelector(".search-bar-order input").addEventListener("input", function () {
        const query = this.value.toLowerCase();
        const suggestionsContainer = document.querySelector(".suggestions");
        suggestionsContainer.innerHTML = "";

        if (!query) {
            suggestionsContainer.style.display = "none"; // Đóng bảng gợi ý nếu không có giá trị
            return;
        }

        chrome.storage.local.get("productList", (data) => {
            if (data.productList) {
                const filteredProducts = data.productList.filter(product => {
                    return product.maTim.toLowerCase().includes(query) ||
                        product.tenHienThi.toLowerCase().includes(query) ||
                        product.donGia.toString().includes(query);
                });

                // Hiển thị tối đa 7 sản phẩm
                filteredProducts.slice(0, 7).forEach(product => {
                    const suggestionItem = document.createElement("div");
                    suggestionItem.className = "suggestion-item";
                    suggestionItem.innerText = product.tenHienThi;

                    // Sự kiện click cho mỗi sản phẩm trong gợi ý
                    suggestionItem.addEventListener("click", () => {
                        console.log("Clicked on product:", product); // Xem sản phẩm nào được nhấp

                        // Tạo thẻ <li> mới cho sản phẩm
                        const newLi = document.createElement("li");
                        newLi.className = "product-order"; // Thêm class cho <li>
                        newLi.innerHTML = `
                        <div class="product-item">
                            <input type="text" value="${product.tenHienThi}" class="product-name"/>
                            <input class="price-product" min="0" value="${product.donGia}" type="number" />
                            <input class="quantity" value="1" min="1" type="number" />
                            <button class="delete-product">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;

                        // Kiểm tra phần tử <ul> và thêm <li>
                        const productList = document.querySelector(".list-products");
                        if (productList) {
                            productList.appendChild(newLi);
                            newLi.querySelector(".quantity").addEventListener("input", updateTotals);
                            newLi.querySelector(".price-product").addEventListener("input", updateTotals);
                            const deleteButton = newLi.querySelector(".delete-product");
                            deleteButton.addEventListener("click", (event) => {
                                event.stopPropagation(); // Ngăn chặn sự kiện click trên dòng
                                newLi.remove(); // Xóa sản phẩm
                                updateTotals();
                                console.log("Removed product from list");
                            });
                            console.log("Added new product to list:", newLi); // Xem sản phẩm đã thêm
                        } else {
                            console.error("Product list <ul> not found!"); // Thông báo nếu không tìm thấy <ul>
                        }
                        updateTotals();

                        // Đóng bảng gợi ý
                        suggestionsContainer.innerHTML = "";
                        suggestionsContainer.style.display = "none"; // Đóng bảng gợi ý
                    });

                    // Thêm item gợi ý vào container
                    suggestionsContainer.appendChild(suggestionItem);
                    // Tạo thanh ngang giữa các gợi ý (nếu cần)
                    const separator = document.createElement("div");
                    separator.className = "separator"; // Class cho thanh ngang
                    suggestionsContainer.appendChild(separator);
                });

                suggestionsContainer.style.display = filteredProducts.length > 0 ? "block" : "none"; // Hiển thị hoặc ẩn bảng gợi ý
            }
        });
    });

    // Thêm sự kiện cho nút xóa trong mỗi sản phẩm
    document.querySelector(".list-products").addEventListener("click", function (event) {
        if (event.target.classList.contains("delete-product")) {
            const productOrderItem = event.target.closest(".product-order");
            if (productOrderItem) {
                productOrderItem.remove();
                console.log("Removed product from list");
            }
        }
    });

});

// Hàm tính toán tổng số sản phẩm và thành tiền
// Hàm cập nhật tổng số sản phẩm và tổng tiền
function updateTotals() {
    let totalQuantity = 0;
    let totalPrice = 0;

    // Tính tổng số lượng và tổng giá
    document.querySelectorAll(".product-order").forEach(product => {
        // Lấy giá và số lượng từ các trường đầu vào dưới dạng chuỗi ban đầu
        let priceString = product.querySelector(".price-product").value;
        let quantity = parseInt(product.querySelector(".quantity").value) || 0;

        // Chuyển đổi giá trị của `price` sang số thực
        let price = parseFloat(priceString);

        // In giá trị ban đầu của chuỗi và sau khi chuyển đổi
        console.log("Original Price String:", priceString, "Parsed Price:", price, "Quantity:", quantity);

        // Kiểm tra giá trị của `price`
        if (!isNaN(price)) {
            totalQuantity += quantity;
            totalPrice += price * quantity;
        }
    });

    // Lấy giá trị voucher và giảm giá
    const voucherValue = parseFloat(document.getElementById("voucher-item").value) || 0;
    const discountValue = parseFloat(document.getElementById("discount-item").value) || 0;

    // Cộng thêm phí vận chuyển
    const shippingOptions = document.querySelectorAll("input[name='phi-ship']");
    let shippingFee = 0;
    shippingOptions.forEach(option => {
        if (option.checked) {
            shippingFee = parseFloat(option.value);
        }
    });

    // Cập nhật tổng tiền sau khi áp dụng voucher và giảm giá
    totalPrice -= voucherValue; // Trừ voucher
    totalPrice -= discountValue; // Trừ giảm giá
    totalPrice += shippingFee; // Cộng phí vận chuyển

    // Đảm bảo tổng tiền không âm
    totalPrice = Math.max(totalPrice, 0);

    // Cập nhật giao diện
    document.getElementById("total-product-item").value = totalQuantity;
    document.getElementById("total-price-item").value = totalPrice.toFixed(0) + 'K'; // Thêm 'K' vào tổng tiền
}



// Lắng nghe sự kiện cho voucher và giảm giá
document.getElementById("voucher-item").addEventListener("input", updateTotals);
document.getElementById("discount-item").addEventListener("input", updateTotals);

// Lắng nghe sự kiện cho các radio button
document.querySelectorAll("input[name='phi-ship']").forEach(radio => {
    radio.addEventListener("change", updateTotals);
});

// Gán sự kiện input cho các ô số lượng
document.querySelector(".list-products").addEventListener("input", function (event) {
    if (event.target.classList.contains("quantity")) {
        updateTotals(); // Cập nhật tổng khi số lượng thay đổi
    }
});

document.querySelectorAll(".quantity").forEach(input => {
    input.addEventListener("input", updateTotals());
});
document.querySelectorAll(".price-product").forEach(input => {
    input.addEventListener("input", updateTotals());
});

//Lên đơn
document.querySelector('.create-btn').addEventListener('click', function() {
    // Kiểm tra nếu không có sản phẩm nào
    const products = document.querySelectorAll('.product-order');
    if (products.length === 0) {
        alert("Không có sản phẩm nào để lên đơn!");
        return; // Dừng lại nếu không có sản phẩm
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
        const price = parseFloat(priceString) || 0; // Chuyển đổi sang số
        const quantity = parseInt(product.querySelector('.quantity').value) || 1;

        const productTotal = price * quantity;
        totalAmount += productTotal;

        if (quantity > 1) {
            productText += `${name} ${price} ${quantity} cái\n`;
            totalExpression += `${price}+`.repeat(quantity);
        } else {
            productText += `${name} ${price}\n`;
            totalExpression += `${price}+`;
        }
    });

    totalExpression = totalExpression.slice(0, -1); // Loại bỏ dấu "+" cuối cùng

    totalExpression += `+${shipFee}ship`;
    if (voucher > 0) totalExpression += `-${voucher}(voucher)`;
    if (discount > 0) totalExpression += `-${discount}( )`;

    let finalTotal = totalAmount + shipFee - voucher - discount;

    let finalText = `Dạ em lên đơn cho mình ạ\n${productText}`;
    finalText += `TC : ${totalExpression} = ${finalTotal}K`;

    if (shipFee === 0) {
        finalText += " (miễn ship)";
    }

    finalText += " ạ";

    navigator.clipboard.writeText(finalText).then(() => {
        alert("Đoạn văn bản đã được sao chép vào bộ nhớ tạm.");
    }).catch(err => {
        console.error("Không thể sao chép vào bộ nhớ tạm:", err);
    });
});

