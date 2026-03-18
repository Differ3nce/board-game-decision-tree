import UsernameForm from "@/components/UsernameForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <div className="text-6xl select-none">🎲</div>
          <h1 className="text-4xl font-bold text-wood-800 leading-tight">
            What Should We Play?
          </h1>
          <p className="text-wood-600 text-lg">
            Enter one or more BoardGameGeek usernames and we&apos;ll find the
            perfect game from your combined collection for tonight.
          </p>
        </div>
        <UsernameForm />
      </div>
    </main>
  );
}
