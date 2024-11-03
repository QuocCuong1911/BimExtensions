//Thêm sản phẩm order mới
document.querySelector('.add-button').addEventListener('click', function() {
    const newProduct = document.createElement('li');
    newProduct.classList.add('product-order');
    newProduct.innerHTML = `
        <div class="product-item">
            <input type="text" placeholder="Tên sản phẩm" class="product-name">
            <input class="price-product" placeholder="giá" type="number">
            <button class="delete-product">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    document.querySelector('.list-products').appendChild(newProduct);

    newProduct.querySelector('.delete-product').addEventListener('click', function() {
        newProduct.remove();
    });

    document.querySelector('.list-products').appendChild(newProduct);
});

