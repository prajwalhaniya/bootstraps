(function () {
    var STORAGE_KEY = "bookTrackerApiKey";

    function getKey() {
        try {
            return localStorage.getItem(STORAGE_KEY) || "";
        } catch (err) {
            return "";
        }
    }

    function setKey(value) {
        try {
            if (value) localStorage.setItem(STORAGE_KEY, value);
            else localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            // localStorage unavailable (private browsing, etc.) — nothing we can do, key just won't persist.
        }
    }

    function render() {
        var key = getKey();
        var input = document.getElementById("apiKeyInput");
        var status = document.getElementById("apiKeyStatus");

        if (input) input.value = key;
        if (status) status.textContent = key ? "API key set" : "No API key set — scanning and saving are off";

        document.querySelectorAll('input[name="apiKey"]').forEach(function (el) {
            el.value = key;
        });
        document.querySelectorAll("[data-requires-api-key]").forEach(function (el) {
            el.hidden = !key;
        });
        document.querySelectorAll("[data-requires-no-api-key]").forEach(function (el) {
            el.hidden = !!key;
        });
    }

    function init() {
        var input = document.getElementById("apiKeyInput");
        var saveBtn = document.getElementById("saveApiKeyBtn");
        var clearBtn = document.getElementById("clearApiKeyBtn");

        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                setKey(input.value.trim());
                render();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                setKey("");
                input.value = "";
                render();
            });
        }

        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
