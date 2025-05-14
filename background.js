let openWindows = [];

// Hàm tạo cửa sổ mới và đóng cửa sổ cũ nếu đã có 2 cửa sổ mở
function createWindow(url, width, height) {
  // Nếu đã có 2 cửa sổ, đóng cửa sổ cũ nhất
  if (openWindows.length >= 2) {
    chrome.windows.remove(openWindows.shift()); // Đóng cửa sổ cũ nhất và loại bỏ ID khỏi mảng
  }

  // Mở cửa sổ mới và thêm ID của cửa sổ vào mảng
  chrome.windows.create({
    url: chrome.runtime.getURL(url),
    type: "popup",
    width: width,
    height: height,
    focused: true
  }, (window) => {
    openWindows.push(window.id); // Thêm ID cửa sổ mới vào cuối mảng
  });
}

// Lắng nghe sự kiện khi nhấp vào biểu tượng extension
chrome.action.onClicked.addListener(() => {
  const width = 800;
  const height = 900;

  chrome.system.display.getInfo((displays) => {
    const display = displays[0];
    const top = Math.round((display.workArea.height - height) / 2);
    const left = Math.round((display.workArea.width - width) / 2);

    createWindow("home/home.html", width, height);
  });
});

// Lắng nghe sự kiện khi sử dụng phím tắt
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_order_window") {
    createWindow("order/order.html", 700, 820);
  }
});

// Xóa ID của cửa sổ khi nó bị đóng để duy trì mảng openWindows chính xác
chrome.windows.onRemoved.addListener((windowId) => {
  openWindows = openWindows.filter((id) => id !== windowId);
});
