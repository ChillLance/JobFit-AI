chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const activeTab = tabs[0];
  document.getElementById("job-title").innerText = activeTab?.title || "無法讀取目前頁面標題";
});

document.getElementById("collect-btn").addEventListener("click", async () => {
  const button = document.getElementById("collect-btn");
  const status = document.getElementById("status");

  button.disabled = true;
  button.innerText = "採集中...";
  status.innerText = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          rawText: document.body ? document.body.innerText.replace(/\s+/g, " ").trim() : ""
        };
      }
    });

    const jobData = results?.[0]?.result;

    if (!jobData) {
      throw new Error("無法取得頁面資料");
    }

    const response = await fetch("http://localhost:3000/api/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      throw new Error("本機 API 回應失敗，請確認 Next.js 有啟動");
    }

    status.innerText = "✅ 已成功加入待分析清單";
    button.innerText = "完成";
  } catch (error) {
    console.error(error);
    status.style.color = "#fca5a5";
    status.innerText = "❌ " + error.message;
    button.disabled = false;
    button.innerText = "重新採集";
  }
});
