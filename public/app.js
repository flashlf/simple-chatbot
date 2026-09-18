// Kebutuhan Prasyarat kelulusan course hacktiv8
// M. Imam Abdullah 18 Sept 2026
// Executive AI Chatbot - Client App Logic

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // DOM Elements
  const messageList = document.getElementById('messageList');
  const chatContainer = document.getElementById('chatContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const scrollBottomBtn = document.getElementById('scrollBottomBtn');
  const audioTriggerBtn = document.getElementById('audioTriggerBtn');
  
  // Audio Modal elements
  const audioModalOverlay = document.getElementById('audioModalOverlay');
  const closeAudioModalBtn = document.getElementById('closeAudioModalBtn');
  const optMicBtn = document.getElementById('optMicBtn');
  const optWindowBtn = document.getElementById('optWindowBtn');
  const optFileBtn = document.getElementById('optFileBtn');
  const audioFileInput = document.getElementById('audioFileInput');

  // Attachment elements
  const attachmentBar = document.getElementById('attachmentBar');
  const attachmentName = document.getElementById('attachmentName');
  const attachmentSize = document.getElementById('attachmentSize');
  const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

  // Recording Banner elements
  const recordingBanner = document.getElementById('recordingBanner');
  const recSourceLabel = document.getElementById('recSourceLabel');
  const recTimer = document.getElementById('recTimer');
  const cancelRecBtn = document.getElementById('cancelRecBtn');
  const stopSendRecBtn = document.getElementById('stopSendRecBtn');
  const botStatusText = document.getElementById('botStatusText');

  // App State
  let conversationHistory = []; // { role: 'user' | 'model', text: string }
  let attachedAudioFile = null; // File or Blob
  let attachedAudioUrl = null;
  let attachedAudioName = '';
  
  // Audio Recording State
  let mediaRecorder = null;
  let audioStream = null;
  let recordedChunks = [];
  let recordingInterval = null;
  let recordingSeconds = 0;
  let currentRecordMode = null; // 'mic' | 'window'

  // ==========================================
  // Auto-resize textarea
  // ==========================================
  function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    checkSendButtonState();
  }

  messageInput.addEventListener('input', adjustTextareaHeight);

  // Send on Enter (without Shift)
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // If screen is wider than 600px (likely desktop keyboard), send directly
      if (window.innerWidth > 600) {
        e.preventDefault();
        if (!sendBtn.disabled) {
          handleSendMessage();
        }
      }
    }
  });

  function checkSendButtonState() {
    const hasText = messageInput.value.trim().length > 0;
    const hasAudio = attachedAudioFile !== null;
    sendBtn.disabled = !(hasText || hasAudio);
  }

  // ==========================================
  // Suggestions click
  // ==========================================
  document.querySelectorAll('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      messageInput.value = prompt;
      adjustTextareaHeight();
      messageInput.focus();
    });
  });

  // ==========================================
  // Clear Chat
  // ==========================================
  clearChatBtn.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus riwayat obrolan ini?')) {
      conversationHistory = [];
      messageList.innerHTML = `
        <div class="welcome-card">
          <div class="welcome-icon">
            <i data-lucide="sparkles"></i>
          </div>
          <h2>Halo! Ada yang bisa saya bantu hari ini?</h2>
          <p>Kirim pesan teks, unggah file audio, gunakan mikrofon, atau rekam audio langsung dari tab/window untuk membuat notulen & transkrip cerdas.</p>
          <div class="quick-suggestions">
            <button class="suggestion-chip" data-prompt="Tolong rangkum poin-poin penting dari diskusi ini.">
              <i data-lucide="file-text"></i> Buat Notulen Rapat
            </button>
            <button class="suggestion-chip" data-prompt="Apa saja rekomendasi tindakan (action items) dari percakapan ini?">
              <i data-lucide="check-circle-2"></i> Ekstrak Action Items
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      // Reattach listener to newly created suggestions
      document.querySelectorAll('.suggestion-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          messageInput.value = btn.getAttribute('data-prompt');
          adjustTextareaHeight();
          messageInput.focus();
        });
      });
      clearAttachment();
    }
  });

  // ==========================================
  // Modal Audio Source Selector
  // ==========================================
  function openAudioModal() {
    audioModalOverlay.style.display = 'flex';
  }

  function closeAudioModal() {
    audioModalOverlay.style.display = 'none';
  }

  audioTriggerBtn.addEventListener('click', openAudioModal);
  closeAudioModalBtn.addEventListener('click', closeAudioModal);
  audioModalOverlay.addEventListener('click', (e) => {
    if (e.target === audioModalOverlay) closeAudioModal();
  });

  // Option 1: File Upload
  optFileBtn.addEventListener('click', () => {
    closeAudioModal();
    audioFileInput.click();
  });

  audioFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|webm|flac|aac)$/i)) {
      alert('Silakan pilih file format audio (MP3, WAV, OGG, M4A, WebM, FLAC)');
      return;
    }

    setAttachedAudio(file, file.name);
    audioFileInput.value = '';
  });

  // Option 2: Microphone
  optMicBtn.addEventListener('click', async () => {
    closeAudioModal();
    await startAudioRecording('mic');
  });

  // Option 3: Window / Tab Audio
  optWindowBtn.addEventListener('click', async () => {
    closeAudioModal();
    await startAudioRecording('window');
  });

  // ==========================================
  // Attachment Management
  // ==========================================
  function setAttachedAudio(fileOrBlob, name) {
    attachedAudioFile = fileOrBlob;
    attachedAudioName = name || 'audio_file.webm';
    if (attachedAudioUrl) URL.revokeObjectURL(attachedAudioUrl);
    attachedAudioUrl = URL.createObjectURL(fileOrBlob);

    attachmentName.textContent = attachedAudioName;
    const sizeKb = (fileOrBlob.size / 1024).toFixed(1);
    attachmentSize.textContent = sizeKb > 1024 ? `${(sizeKb/1024).toFixed(2)} MB` : `${sizeKb} KB`;
    attachmentBar.style.display = 'flex';
    checkSendButtonState();
  }

  function clearAttachment() {
    attachedAudioFile = null;
    if (attachedAudioUrl) {
      URL.revokeObjectURL(attachedAudioUrl);
      attachedAudioUrl = null;
    }
    attachedAudioName = '';
    attachmentBar.style.display = 'none';
    checkSendButtonState();
  }

  removeAttachmentBtn.addEventListener('click', clearAttachment);

  // ==========================================
  // Audio Recording (Microphone & Window Audio)
  // ==========================================
  async function startAudioRecording(mode) {
    currentRecordMode = mode;
    recordedChunks = [];
    recordingSeconds = 0;

    try {
      if (mode === 'mic') {
        recSourceLabel.textContent = 'Merekam Mikrofon';
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (mode === 'window') {
        recSourceLabel.textContent = 'Merekam Suara Window / Tab';
        // Request display media with audio
        audioStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Verify audio track exists
        const audioTracks = audioStream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
          // Stop stream immediately
          audioStream.getTracks().forEach(track => track.stop());
          audioStream = null;
          alert('Audio tidak terdeteksi! Harap pastikan Anda mencentang opsi "Bagikan audio" (Share audio) saat memilih window atau tab browser.');
          return;
        }

        // When user stops screen share from native browser banner
        audioStream.getVideoTracks().forEach(track => {
          track.onended = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              stopAndFinalizeRecording();
            }
          };
        });
      }

      // Determine supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      mediaRecorder = new MediaRecorder(audioStream, selectedMimeType ? { mimeType: selectedMimeType } : {});

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms

      // Show recording banner
      recordingBanner.style.display = 'flex';
      botStatusText.innerHTML = `<span style="color: #ef4444;">● Merekam ${mode === 'mic' ? 'Mic' : 'Audio Window'}</span>`;
      updateTimerDisplay();
      recordingInterval = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Izin akses audio ditolak oleh browser.');
      } else {
        alert(`Gagal memulai rekaman: ${err.message}`);
      }
      cleanupRecording();
    }
  }

  function updateTimerDisplay() {
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    recTimer.textContent = `${mins}:${secs}`;
  }

  function cleanupRecording() {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
    recordingBanner.style.display = 'none';
    botStatusText.innerHTML = 'Online &bull; AI Note & Audio';
    mediaRecorder = null;
    currentRecordMode = null;
  }

  cancelRecBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    cleanupRecording();
  });

  stopSendRecBtn.addEventListener('click', () => {
    stopAndFinalizeRecording();
  });

  function stopAndFinalizeRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    mediaRecorder.onstop = () => {
      const mime = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(recordedChunks, { type: mime });
      const filename = `${currentRecordMode === 'mic' ? 'mic_recording' : 'window_audio'}_${Date.now()}.webm`;
      
      cleanupRecording();
      setAttachedAudio(blob, filename);
    };

    mediaRecorder.stop();
  }

  // ==========================================
  // Send Message Logic
  // ==========================================
  async function handleSendMessage() {
    const textPrompt = messageInput.value.trim();
    const hasAudio = attachedAudioFile !== null;

    if (!textPrompt && !hasAudio) return;

    // Reset input field
    messageInput.value = '';
    adjustTextareaHeight();

    const currentAudio = attachedAudioFile;
    const currentAudioName = attachedAudioName;
    const currentAudioUrl = attachedAudioUrl;

    // Clear active attachment from footer
    attachedAudioFile = null;
    attachedAudioUrl = null;
    attachedAudioName = '';
    attachmentBar.style.display = 'none';
    checkSendButtonState();

    // Render User Message in Chat
    appendUserMessage(textPrompt, currentAudio ? { url: currentAudioUrl, name: currentAudioName } : null);

    // Render Bot Typing Indicator
    const typingElement = appendTypingIndicator();
    scrollToBottom();

    try {
      let botReply = '';

      if (hasAudio) {
        // Send audio to /generate-from-audio
        const formData = new FormData();
        formData.append('audio', currentAudio, currentAudioName);
        if (textPrompt) {
          formData.append('prompt', textPrompt);
        }

        const response = await fetch('/generate-from-audio', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server error ${response.status}`);
        }

        const data = await response.json();
        botReply = data.result || 'Tidak ada respons dari AI.';

        // Add to history
        conversationHistory.push({
          role: 'user',
          text: `[Mengirim rekaman audio: ${currentAudioName}] ${textPrompt}`
        });
        conversationHistory.push({
          role: 'model',
          text: botReply
        });

      } else {
        // Text-only conversation: Use /api/query for contextual memory
        conversationHistory.push({
          role: 'user',
          text: textPrompt
        });

        // Format conversation for /api/query: { conversation: [{ role, text }] }
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation: conversationHistory })
        });

        if (!response.ok) {
          // Fallback to /generate-text if /api/query errors
          const fallbackRes = await fetch('/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: textPrompt })
          });
          if (!fallbackRes.ok) {
            const errData = await fallbackRes.json().catch(() => ({}));
            throw new Error(errData.message || `Server error ${fallbackRes.status}`);
          }
          const fbData = await fallbackRes.json();
          botReply = fbData.result || 'Tidak ada respons.';
        } else {
          const data = await response.json();
          botReply = data.result || 'Tidak ada respons.';
        }

        conversationHistory.push({
          role: 'model',
          text: botReply
        });
      }

      // Replace typing indicator with bot response
      removeTypingIndicator(typingElement);
      appendBotMessage(botReply);

    } catch (error) {
      console.error('Chat error:', error);
      removeTypingIndicator(typingElement);
      appendBotMessage(`⚠️ **Maaf, terjadi kesalahan:**\n\`${error.message}\`\n\nPastikan server aktif dan kunci GEMINI_API_KEY valid.`);
    }

    scrollToBottom();
  }

  sendBtn.addEventListener('click', handleSendMessage);

  // ==========================================
  // Render Message Elements
  // ==========================================
  function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function appendUserMessage(text, audioInfo) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    let audioHtml = '';
    if (audioInfo) {
      audioHtml = createAudioPlayerHtml(audioInfo.url, audioInfo.name);
    }

    const textHtml = text ? `<div class="message-text">${escapeHtml(text)}</div>` : '';

    row.innerHTML = `
      <div class="message-bubble">
        ${audioHtml}
        ${textHtml}
        <div class="message-meta">
          <span>${getCurrentTime()}</span>
          <i data-lucide="check" style="width: 12px; height: 12px;"></i>
        </div>
      </div>
    `;

    messageList.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
    initAudioPlayers(row);
  }

  function appendBotMessage(markdownText) {
    const row = document.createElement('div');
    row.className = 'message-row bot';

    // Parse markdown using marked.js
    let formattedHtml = '';
    if (window.marked) {
      formattedHtml = window.marked.parse(markdownText);
    } else {
      formattedHtml = `<p>${escapeHtml(markdownText).replace(/\n/g, '<br>')}</p>`;
    }

    row.innerHTML = `
      <div class="message-bubble">
        <div class="message-content">${formattedHtml}</div>
        <div class="message-meta">
          <span>${getCurrentTime()}</span>
          <span>&bull; Gemini AI</span>
        </div>
      </div>
    `;

    messageList.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
  }

  function appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot typing-row';
    row.innerHTML = `
      <div class="message-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    messageList.appendChild(row);
    return row;
  }

  function removeTypingIndicator(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  // ==========================================
  // Custom Audio Player in Chat
  // ==========================================
  function createAudioPlayerHtml(url, name) {
    return `
      <div class="audio-card" data-src="${url}">
        <audio src="${url}" preload="metadata"></audio>
        <button class="audio-play-btn" title="Play">
          <i data-lucide="play" style="width: 16px; height: 16px;"></i>
        </button>
        <div class="audio-info">
          <span class="audio-title">${escapeHtml(name)}</span>
          <div class="audio-progress-container">
            <input type="range" class="audio-slider" min="0" max="100" value="0" />
            <span class="audio-duration">00:00</span>
          </div>
        </div>
      </div>
    `;
  }

  function initAudioPlayers(container) {
    container.querySelectorAll('.audio-card').forEach(card => {
      const audio = card.querySelector('audio');
      const playBtn = card.querySelector('.audio-play-btn');
      const slider = card.querySelector('.audio-slider');
      const durationDisplay = card.querySelector('.audio-duration');

      function formatSecs(sec) {
        if (isNaN(sec) || !isFinite(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      audio.addEventListener('loadedmetadata', () => {
        durationDisplay.textContent = formatSecs(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100;
          slider.value = progress;
          durationDisplay.textContent = formatSecs(audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        playBtn.innerHTML = '<i data-lucide="play" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();
        slider.value = 0;
      });

      playBtn.addEventListener('click', () => {
        // Pause other audios
        document.querySelectorAll('audio').forEach(a => {
          if (a !== audio && !a.paused) a.pause();
        });

        if (audio.paused) {
          audio.play().then(() => {
            playBtn.innerHTML = '<i data-lucide="pause" style="width: 16px; height: 16px;"></i>';
            if (window.lucide) window.lucide.createIcons();
          }).catch(console.error);
        } else {
          audio.pause();
          playBtn.innerHTML = '<i data-lucide="play" style="width: 16px; height: 16px;"></i>';
          if (window.lucide) window.lucide.createIcons();
        }
      });

      slider.addEventListener('input', () => {
        if (audio.duration) {
          audio.currentTime = (slider.value / 100) * audio.duration;
        }
      });
    });
  }

  // ==========================================
  // Helper & Scroll
  // ==========================================
  function scrollToBottom() {
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  chatContainer.addEventListener('scroll', () => {
    const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 120;
    scrollBottomBtn.style.display = isNearBottom ? 'none' : 'flex';
  });

  scrollBottomBtn.addEventListener('click', scrollToBottom);

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }
});

