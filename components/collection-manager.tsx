"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, Plus, Trash2, Users, Wallet, Receipt, AlertCircle, Crown, Gift } from "lucide-react"

interface Member {
  id: string
  name: string
  amount: number
  paid: boolean
  isOrganizer: boolean
  isTreating: boolean // 奢る人かどうか
  treatingAmountPerPerson: number // 1人あたりいくら肩代わりするか
}

// 数式を安全に評価する関数
function evaluateExpression(expr: string): number | null {
  const cleaned = expr.replace(/[^0-9+\-*/().]/g, "")
  if (!cleaned) return null
  try {
    // 安全な評価: 数字と演算子のみ許可
    if (!/^[\d+\-*/().\s]+$/.test(cleaned)) return null
    const result = Function(`"use strict"; return (${cleaned})`)()
    if (typeof result === "number" && isFinite(result)) {
      return Math.round(result)
    }
    return null
  } catch {
    return null
  }
}



export function CollectionManager() {
  const [members, setMembers] = useState<Member[]>([
    // { id: "1", name: "A氏（幹事）", amount: 4000, paid: true, isOrganizer: true, isTreating: false, treatingAmountPerPerson: 0 },
  ])
  const [newMemberName, setNewMemberName] = useState("")
  const [amountPerPerson, setAmountPerPerson] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [expenseInput, setExpenseInput] = useState("0")
  const [treatingCount, setTreatingCount] = useState(0) // 奢る人数
  const [enterPressCount, setEnterPressCount] = useState(0) // Enterキープレスカウント
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalCollected = members.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0)
  const totalExpected = members.reduce((sum, m) => sum + m.amount, 0)
  const unpaidMembers = members.filter((m) => !m.paid)
  const unpaidAmount = unpaidMembers.reduce((sum, m) => sum + m.amount, 0)
  const difference = totalCollected - totalExpense

  const addMember = (asOrganizer = false) => {
    if (newMemberName.trim()) {
      setMembers([
        ...members,
        {
          id: Date.now().toString(),
          name: newMemberName.trim(),
          amount: amountPerPerson,
          paid: asOrganizer,
          isOrganizer: asOrganizer,
          isTreating: false,
          treatingAmountPerPerson: 0,
        },
      ])
      setNewMemberName("")
    }
  }

  const toggleOrganizer = (id: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, isOrganizer: !m.isOrganizer } : m)))
  }

  const toggleTreating = (id: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, isTreating: !m.isTreating } : m)))
  }

  const updateTreatingAmount = (id: string, amount: number) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, treatingAmountPerPerson: amount } : m)))
  }

  // 奢りを適用した金額を計算
  const applyTreatingAmounts = () => {
    const treatingMembers = members.filter((m) => m.isTreating)
    const nonTreatingMembers = members.filter((m) => !m.isTreating)
    
    if (treatingMembers.length === 0 || nonTreatingMembers.length === 0) return
    
    // 各奢られる人が受ける割引の合計（全奢り人の肩代わり額の合計）
    const totalDiscountPerPerson = treatingMembers.reduce((sum, m) => sum + m.treatingAmountPerPerson, 0)
    
    setMembers(members.map((m) => {
      if (m.isTreating) {
        // 奢る人: 基本金額 + (自分の肩代わり額 × 奢られる人数)
        return { ...m, amount: amountPerPerson + (m.treatingAmountPerPerson * nonTreatingMembers.length) }
      } else {
        // 奢られる人: 基本金額 - 全奢り人の肩代わり額合計
        return { ...m, amount: Math.max(0, amountPerPerson - totalDiscountPerPerson) }
      }
    }))
  }

  const handleExpenseInput = (value: string) => {
    setExpenseInput(value)
    const result = evaluateExpression(value)
    if (result !== null) {
      setTotalExpense(result)
    }
  }

  const togglePaid = (id: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, paid: !m.paid } : m)))
  }

  const removeMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id))
  }

  const updateMemberAmount = (id: string, amount: number) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, amount } : m)))
  }

  const applyAmountToAll = () => {
    setMembers(members.map((m) => ({ ...m, amount: amountPerPerson })))
  }

  const handleAmountChange = (value: string, setter: (amount: number) => void) => {
    const cleaned = value.replace(/[^0-9]/g, "")
    const parsed = cleaned === "" ? 0 : parseInt(cleaned, 10)
    setter(parsed)
  }

  const handleMemberNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      
      // 前のタイマーをクリア
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current)
      }

      // Enterキーが2回押されたかチェック
      if (enterPressCount === 1) {
        // 2回目のEnter
        addMember(false)
        setEnterPressCount(0)
      } else {
        // 1回目のEnter
        setEnterPressCount(1)
        // 500ms後にリセット
        enterTimeoutRef.current = setTimeout(() => {
          setEnterPressCount(0)
        }, 500)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">集金マネージャー</h1>
          <p className="mt-1 text-muted-foreground">飲み会の集金状況を簡単に管理</p>
        </header>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">参加人数</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{members.length}人</div>
              <p className="text-xs text-muted-foreground">
                支払済: {members.filter((m) => m.paid).length}人
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">徴収済み</CardTitle>
              <Wallet className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">¥{totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">予定: ¥{totalExpected.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">飲み会費用</CardTitle>
              <Receipt className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">¥{totalExpense.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">お店への支払い</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">差額</CardTitle>
              <AlertCircle
                className={`h-4 w-4 ${difference >= 0 ? "text-success" : "text-destructive"}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${difference >= 0 ? "text-success" : "text-destructive"}`}
              >
                {difference >= 0 ? "+" : ""}¥{difference.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {difference >= 0 ? "余剰" : "不足"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card className="mb-8 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-card-foreground">1人あたりの金額</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">¥</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={amountPerPerson === 0 ? "" : amountPerPerson.toLocaleString()}
                    onChange={(e) => handleAmountChange(e.target.value, setAmountPerPerson)}
                    className="bg-input text-card-foreground"
                  />
                </div>
              </div>
              <Button onClick={applyAmountToAll} variant="secondary">
                全員に適用
              </Button>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-card-foreground">飲み会の総額</label>
                <p className="text-xs text-muted-foreground">数式OK（例: 3500*20）</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={expenseInput}
                    onChange={(e) => handleExpenseInput(e.target.value)}
                    placeholder="3500*20"
                    className="bg-input text-card-foreground"
                  />
                  <span className="whitespace-nowrap text-muted-foreground">= ¥{totalExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 奢り設定 */}
            {members.some((m) => m.isTreating) && (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
                <div className="space-y-4">
                  <p className="flex items-center gap-2 font-medium text-accent">
                    <Gift className="h-4 w-4" />
                    奢り設定
                  </p>
                  <p className="text-xs text-muted-foreground">
                    奢る人ごとに「1人あたりいくら肩代わりするか」を設定してください
                  </p>
                  <div className="space-y-2">
                    {members.filter((m) => m.isTreating).map((member) => {
                      const nonTreatingCount = members.filter((m) => !m.isTreating).length
                      const totalForThisTreater = member.treatingAmountPerPerson * nonTreatingCount
                      return (
                        <div key={member.id} className="flex flex-col gap-2 rounded-md bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-card-foreground">{member.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({nonTreatingCount}人 × ¥{member.treatingAmountPerPerson.toLocaleString()} = ¥{totalForThisTreater.toLocaleString()} 追加負担)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">1人あたり</span>
                            <span className="text-muted-foreground">¥</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={member.treatingAmountPerPerson === 0 ? "" : member.treatingAmountPerPerson.toLocaleString()}
                              onChange={(e) => handleAmountChange(e.target.value, (amount) => updateTreatingAmount(member.id, amount))}
                              className="w-24 bg-input text-right text-card-foreground"
                              placeholder="500"
                            />
                            <span className="text-sm text-muted-foreground">肩代わり</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      奢られる人の支払額: ¥{Math.max(0, amountPerPerson - members.filter((m) => m.isTreating).reduce((sum, m) => sum + m.treatingAmountPerPerson, 0)).toLocaleString()}
                    </p>
                    <Button onClick={applyTreatingAmounts} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Gift className="mr-2 h-4 w-4" />
                      金額を自動計算
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unpaid Members Alert */}
        {unpaidMembers.length > 0 && (
          <Card className="mb-8 border-warning/30 bg-warning/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                未回収: {unpaidMembers.length}人 (¥{unpaidAmount.toLocaleString()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unpaidMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => togglePaid(member.id)}
                    className="flex items-center gap-2 rounded-full bg-warning/20 px-3 py-1 text-sm text-warning transition-colors hover:bg-success/30 hover:text-success"
                  >
                    {member.name}
                    <Check className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">クリックで支払済みに変更</p>
            </CardContent>
          </Card>
        )}

        {/* Add Member */}
        <Card className="mb-8 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">メンバー追加</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="名前を入力"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={handleMemberNameKeyDown}
                className="flex-1 bg-input text-card-foreground placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <Button onClick={() => addMember(false)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  追加
                </Button>
                <Button onClick={() => addMember(true)} variant="outline" className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground sm:flex-none">
                  <Crown className="mr-2 h-4 w-4" />
                  幹事として追加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">メンバー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    member.paid
                      ? "border-success/30 bg-success/10"
                      : "border-border bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePaid(member.id)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        member.paid
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {member.paid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${member.paid ? "text-success" : "text-card-foreground"}`}>
                          {member.name}
                        </p>
                        {member.isOrganizer && (
                          <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                            <Crown className="h-3 w-3" />
                            幹事
                          </span>
                        )}
                        {member.isTreating && (
                          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                            <Gift className="h-3 w-3" />
                            奢り
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.paid ? "支払済み" : "未払い"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">¥</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={member.amount === 0 ? "" : member.amount.toLocaleString()}
                        onChange={(e) => handleAmountChange(e.target.value, (amount) => updateMemberAmount(member.id, amount))}
                        className="w-24 bg-input text-right text-card-foreground"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTreating(member.id)}
                      className={member.isTreating ? "text-primary" : "text-muted-foreground hover:text-primary"}
                      title={member.isTreating ? "奢りを解除" : "奢る人に設定"}
                    >
                      <Gift className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleOrganizer(member.id)}
                      className={member.isOrganizer ? "text-accent" : "text-muted-foreground hover:text-accent"}
                      title={member.isOrganizer ? "幹事を解除" : "幹事に設定"}
                    >
                      <Crown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(member.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {members.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>メンバーがいません</p>
                <p className="text-sm">上の入力欄から追加してください</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">徴収進捗</span>
            <span className="text-card-foreground">
              {Math.round((totalCollected / totalExpected) * 100) || 0}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((totalCollected / totalExpected) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
