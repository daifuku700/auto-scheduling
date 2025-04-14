"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ScheduleItem } from "@/lib/gemini";
import { ExtractedScheduleList } from "@/components/ExtractedScheduleList";
import { ScheduleConfirmationModal } from "@/components/ScheduleConfirmationModal";

// Base64エンコードヘルパー
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Remove data:mime/type;base64, prefix
    reader.onerror = error => reject(error);
  });
};

export function ScheduleInputForm() {
  const { data: session, status } = useSession();
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedSchedules, setExtractedSchedules] = useState<ScheduleItem[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  // セッション（ログイン状態）の変化を監視
  useEffect(() => {
    // ログアウトした場合
    if (status === "unauthenticated") {
      // 抽出された予定データをクリア
      setExtractedSchedules([]);
      setHasExtracted(false);

      // モーダルが開いていたら閉じる
      if (isModalOpen) {
        setIsModalOpen(false);
        setSelectedSchedule(null);
      }
    }
  }, [status, isModalOpen]);

  // Check camera support on component mount
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setIsCameraSupported(hasCamera);
      } catch (error) {
        console.warn('カメラのサポート確認中にエラーが発生しました:', error);
        setIsCameraSupported(false);
      }
    };

    checkCameraSupport();
  }, []);

  // Function to handle setting the selected file and preview
  const handleFileSelected = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setInputText(""); // Clear text input
      setInputType("image"); // Switch to image tab if not already
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (file) {
        alert("画像ファイルを選択してください。");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(e.target.files?.[0] || null);
    e.target.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (selectedFile) {
      setSelectedFile(null); // Clear file input when text is entered
      setPreviewUrl(null);
    }
  };

  // Paste event handler
  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (inputType !== 'image') return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const pastedFile = new File([blob], `pasted-image-${Date.now()}.${blob.type.split('/')[1]}`, { type: blob.type });
          handleFileSelected(pastedFile);
          event.preventDefault();
          break;
        }
      }
    }
  }, [inputType]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isTextInput = inputType === "text" && inputText.trim();
    const isImageInput = inputType === "image" && selectedFile;

    if (!isTextInput && !isImageInput) {
      alert("テキストを入力するか、画像を選択してください。");
      return;
    }

    if (!session) {
      alert("予定を登録するにはログインが必要です。");
      return;
    }

    setIsLoading(true);
    setExtractedSchedules([]);
    setHasExtracted(false);

    try {
      let requestBody: any;
      if (isTextInput) {
        requestBody = { text: inputText };
      } else if (isImageInput) {
        const base64Image = await fileToBase64(selectedFile);
        requestBody = {
          imageData: {
            mimeType: selectedFile.type,
            base64: base64Image,
          },
        };
      }

      const response = await fetch("/api/extract-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error("サーバーから空のレスポンスが返されました");
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("レスポンスのJSON解析に失敗:", parseError);
        console.error("受信したレスポンス:", responseText);
        throw new Error("サーバーからの応答を処理できませんでした。");
      }
      if (!response.ok) {
        const errorMsg = data?.error || data?.details || "予定の抽出に失敗しました";
        throw new Error(errorMsg);
      }
      if (!data || !Array.isArray(data.schedules)) {
        console.error("不正なレスポンス形式:", data);
        throw new Error("サーバーから無効なデータ形式が返されました");
      }
      setExtractedSchedules(data.schedules);
      setHasExtracted(true);
      if (data.schedules.length === 0) {
        alert("入力から予定を抽出できませんでした。");
      }
    } catch (error) {
      console.error("エラーが発生しました:", error);
      alert(`予定の抽出中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedSchedules([]);
    setHasExtracted(false);
  };

  const handleScheduleClick = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleUpdateSchedule = (updatedSchedule: ScheduleItem) => {
    setExtractedSchedules(extractedSchedules.map(schedule =>
      schedule === selectedSchedule ? updatedSchedule : schedule
    ));
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setShowCameraPreview(true);

      // Stop any active streams first
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('カメラの起動に失敗しました:', error);
      alert('カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。');
      setIsCapturing(false);
      setShowCameraPreview(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      // Draw the current video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to file
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFileSelected(file);
        }
        stopCamera();
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('画像のキャプチャに失敗しました:', error);
      alert('画像のキャプチャに失敗しました。');
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setShowCameraPreview(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">予定入力</h2>

      {/* Input Type Selector */}
      <div className="mb-4 flex space-x-4 border-b">
        <button
          onClick={() => setInputType("text")}
          className={`py-2 px-4 text-sm font-medium ${inputType === "text" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          テキスト入力
        </button>
        <button
          onClick={() => setInputType("image")}
          className={`py-2 px-4 text-sm font-medium ${inputType === "image" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          画像アップロード
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {inputType === "text" ? (
          <div className="mb-4">
            <label htmlFor="scheduleText" className="block text-sm font-medium text-gray-700 mb-2">
              予定が含まれたテキストを入力してください
            </label>
            <textarea
              id="scheduleText"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 明日の13時から14時まで会議があります。金曜日までにレポートを提出する必要があります。"
              value={inputText}
              onChange={handleTextChange}
              disabled={isLoading || !session}
            />
            <p className="mt-2 text-sm text-gray-500">
              入力されたテキストから予定を抽出します。
            </p>
          </div>
        ) : (
          <div className="mb-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">
              予定が書かれた画像をアップロード、ペースト、または撮影してください
            </p>
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !session}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
              </svg>
              ファイルを選択
            </button>
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              id="scheduleImage"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading || !session}
            />

            {/* Camera Button */}
            {isCameraSupported && (
              <button
                type="button"
                onClick={startCamera}
                disabled={isLoading || !session || isCapturing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
                  <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0" />
                </svg>
                カメラで撮影
              </button>
            )}

            {/* Hidden Camera Input */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading || !session}
            />

            {/* Camera Preview Modal */}
            {showCameraPreview && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-xl w-full">
                  <div className="p-4 border-b flex justify-between">
                    <h3 className="font-medium">カメラ</h3>
                    <button type="button" onClick={stopCamera} className="text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                      </svg>
                    </button>
                  </div>
                  <div className="relative bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-auto"
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>
                  <div className="p-4 flex justify-center">
                    <button
                      type="button"
                      onClick={captureImage}
                      className="rounded-full w-16 h-16 bg-white border-4 border-blue-500 flex items-center justify-center"
                    >
                      <div className="rounded-full w-12 h-12 bg-blue-500"></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paste Instruction */}
            <p className="text-center text-sm text-gray-500">
              または、画像をここにペーストしてください (Ctrl+V / Cmd+V)
            </p>

            {/* Preview Area */}
            {previewUrl && !showCameraPreview && (
              <div className="mt-4 p-4 border rounded-md bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">プレビュー:</p>
                <img src={previewUrl} alt="選択された画像" className="max-w-full max-h-60 border rounded-md mx-auto" />
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                  disabled={isLoading}
                >
                  画像をクリア
                </button>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-500">
              画像内のテキストから予定を抽出します。
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {(hasExtracted || inputText || selectedFile) && (
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              onClick={handleReset}
              disabled={isLoading}
            >
              リセット
            </button>
          )}
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium
              ${!session
                ? 'bg-gray-400 cursor-not-allowed'
                : isLoading
                  ? 'bg-blue-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            disabled={isLoading || !session || (inputType === 'text' && !inputText.trim()) || (inputType === 'image' && !selectedFile)}
          >
            {isLoading ? '処理中...' : '予定を抽出'}
          </button>
        </div>

        {!session && (
          <p className="mt-4 text-sm text-orange-600">
            予定を抽出・登録するには、まずGoogle アカウントでログインしてください。
          </p>
        )}
      </form>

      {hasExtracted && (
        <ExtractedScheduleList
          schedules={extractedSchedules}
          onScheduleClick={handleScheduleClick}
        />
      )}

      {isModalOpen && selectedSchedule && (
        <ScheduleConfirmationModal
          schedule={selectedSchedule}
          onClose={handleCloseModal}
          onUpdate={handleUpdateSchedule}
        />
      )}
    </div>
  );
}
