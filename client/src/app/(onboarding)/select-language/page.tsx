'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English', emoji: '🇬🇧' },
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', emoji: '🇧🇷' },
  { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
]

export default function SelectLanguagePage() {
  const router = useRouter()
  const [selectedLang, setSelectedLang] = useState<string | null>(null)

  const handleContinue = () => {
    // TODO: Save language preference via API when backend supports it
    if (selectedLang) {
      // Could store in localStorage or send to API
      localStorage.setItem('preferredLanguage', selectedLang)
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 space-y-6">
            <div className="flex justify-center">
              <div className="flex items-center gap-3 font-bold tracking-tight">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                  <span className="text-lg font-extrabold">VR</span>
                  <div className="absolute -right-1 -top-1">
                    <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  </div>
                </div>
                <span className="text-2xl font-bold">Circlo</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                Choose your language
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Select your preferred language for the app. You can change this later in settings.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all cursor-pointer ${
                    selectedLang === lang.code
                      ? 'border-primary bg-accent shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-3xl">{lang.emoji}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleContinue}
                disabled={!selectedLang}
                className="min-w-[160px]"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can change your language anytime in settings
        </p>
      </div>
    </div>
  )
}
