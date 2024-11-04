chrome.action.onClicked.addListener(() => {
  const width = 800;
  const height = 900;

  chrome.system.display.getInfo((displays) => {''
      const display = displays[0];
      const top = Math.round((display.workArea.height - height) / 2);
      const left = Math.round((display.workArea.width - width) / 2);

      chrome.windows.create({
          url: chrome.runtime.getURL("home/home.html"),
          type: "popup",
          width: width,
          height: height,
          top: top,
          left: left
      });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open_order_window") {
      chrome.windows.create({
          url: "order/order.html",
          type: "popup",
          width: 700, // Điều chỉnh kích thước theo nhu cầu
          height: 800,
          focused: true
      });
  }
});