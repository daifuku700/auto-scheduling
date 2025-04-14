import { LoginButton } from "@/components/LoginButton";
import { ScheduleInputForm } from "@/components/ScheduleInputForm";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-6 bg-white shadow-sm border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">自動予定登録アプリ</h1>
          <LoginButton />
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">自動予定登録アプリ</h2>
            <p className="mb-6 text-gray-600">
              テキストを入力すると、AI が自動で予定を抽出し Google Calendar や Google Tasks に登録します。
              まずは Google アカウントでログインしてください。
            </p>
            <div className="flex justify-center">
              <LoginButton />
            </div>
          </div>

          <ScheduleInputForm />
        </div>
      </main>

      <footer className="py-4 px-6 bg-gray-50 border-t text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} 自動予定登録アプリ
      </footer>
    </div>
  );
}
