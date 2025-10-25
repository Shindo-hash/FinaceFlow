import React, { useState } from 'react';
import { Plus, X, LogOut, Trash2, AlertCircle, AlertTriangle, Edit, Eye } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './styles.css';
import * as hooks from './hooks';
import * as utils from './utils';

export default function App() {
  const auth = hooks.useAuth();
  const settings = hooks.useUserSettings(auth.user?.id);
  const cardsHook = hooks.useCards(auth.user?.id);
  const transactionsHook = hooks.useTransactions(auth.user?.id);
  const billsHook = hooks.useBills(auth.user?.id);
  const debtsHook = hooks.useDebts(auth.user?.id);
  const invoicesHook = hooks.useInvoices(auth.user?.id, cardsHook.cards, transactionsHook.transactions, debtsHook.debts);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', type: 'credito', credit_limit: '', due_day: 10, closing_day: 5 });
  const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', method: 'pix', type: 'expense', cardId: '', category: '' });
  const [newBill, setNewBill] = useState({ description: '', amount: '', due_date: '', status: 'pending' });
  const [newDebt, setNewDebt] = useState({ description: '', total_value: '', total_installments: '', paid_installments: 0, payment_method: 'cartao', card_id: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Estados para inputs formatados de moeda
  const [salaryInput, setSalaryInput] = useState('0,00');
  const [spendingLimitInput, setSpendingLimitInput] = useState('0,00');
  const [savingGoalInput, setSavingGoalInput] = useState('0,00');

  // Carregar valores formatados quando settings mudar
  React.useEffect(() => {
    if (settings.salary > 0) {
      setSalaryInput(utils.formatCurrencyInput(settings.salary * 100));
    }
    if (settings.spendingLimit > 0) {
      setSpendingLimitInput(utils.formatCurrencyInput(settings.spendingLimit * 100));
    }
    if (settings.savingGoal > 0) {
      setSavingGoalInput(utils.formatCurrencyInput(settings.savingGoal * 100));
    }
  }, [settings.salary, settings.spendingLimit, settings.savingGoal]);

  const handleSalaryChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setSalaryInput(utils.formatCurrencyInput(value));
    settings.updateSalary(parseInt(value) / 100 || 0);
  };

  const handleSpendingLimitChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setSpendingLimitInput(utils.formatCurrencyInput(value));
    settings.updateSpendingLimit(parseInt(value) / 100 || 0);
  };

  const handleSavingGoalChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setSavingGoalInput(utils.formatCurrencyInput(value));
    settings.updateSavingGoal(parseInt(value) / 100 || 0);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    const { error } = await auth.signUp(email, password);
    if (error) setAuthMessage('Erro: ' + error.message);
    else setAuthMessage('Cadastro realizado! Verifique seu email.');
    setAuthLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    const { error } = await auth.signIn(email, password);
    if (error) setAuthMessage('Erro: ' + error.message);
    setAuthLoading(false);
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.name || !newCard.credit_limit) return alert('Preencha nome e limite!');
    await cardsHook.addCard(newCard);
    setNewCard({ name: '', type: 'credito', credit_limit: '', due_day: 10, closing_day: 5 });
    setShowCardModal(false);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTransaction.description || !newTransaction.amount) return alert('Preencha descricao e valor!');
    if (editingTransaction) {
      await transactionsHook.updateTransaction(editingTransaction.id, newTransaction);
      setEditingTransaction(null);
    } else {
      await transactionsHook.addTransaction(newTransaction);
    }
    setNewTransaction({ description: '', amount: '', method: 'pix', type: 'expense', cardId: '', category: '' });
    setShowTransactionModal(false);
    cardsHook.reload();
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!newBill.description || !newBill.amount || !newBill.due_date) return alert('Preencha todos os campos!');
    await billsHook.addBill(newBill);
    setNewBill({ description: '', amount: '', due_date: '', status: 'pending' });
    setShowBillModal(false);
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!newDebt.description || !newDebt.total_value || !newDebt.total_installments) {
      return alert('Preencha descricao, valor total e numero de parcelas!');
    }
    if (newDebt.payment_method === 'cartao' && !newDebt.card_id) return alert('Selecione um cartao!');
    await debtsHook.addDebt(newDebt);
    setNewDebt({ description: '', total_value: '', total_installments: '', paid_installments: 0, payment_method: 'cartao', card_id: '' });
    setShowDebtModal(false);
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    await invoicesHook.payInvoice(selectedInvoice.id, selectedInvoice.total_amount, async () => {
      // Fechar modal PRIMEIRO
      setSelectedInvoice(null);
      setShowInvoiceModal(false);
      
      // Recarregar TUDO
      await cardsHook.reload();
      await debtsHook.reload();
      await transactionsHook.reload();
      await invoicesHook.reload();
      
      alert('Fatura paga com sucesso!');
    });
  };

  const handleGenerateInvoice = async (cardId) => {
    const currentMonth = utils.getCurrentMonth();
    await invoicesHook.generateInvoice(cardId, currentMonth);
    alert('Fatura gerada!');
  };

  const startEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      description: transaction.description,
      amount: transaction.amount.toString(),
      method: transaction.method,
      type: transaction.type,
      cardId: transaction.card_id || '',
      category: transaction.category || ''
    });
    setShowTransactionModal(true);
  };

  const openInvoiceDetails = (invoice) => {
    setSelectedInvoiceForDetails(invoice);
    setShowInvoiceDetailsModal(true);
  };

  const calculateCurrentInvoice = (cardId) => {
    const currentMonth = utils.getCurrentMonth();
    
    // Transações do mês atual
    const transactions = transactionsHook.transactions.filter(t => 
      t.card_id === cardId && 
      t.method === 'credito' && 
      t.type === 'expense' &&
      t.transaction_date.startsWith(currentMonth)
    );
    const transactionsTotal = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Parcelas que caem ESTE mês (usando a mesma lógica da fatura)
    const monthInstallments = utils.getMonthlyInstallmentsForCard(
      debtsHook.debts, 
      cardId, 
      currentMonth
    );
    const installmentsTotal = monthInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0);
    
    console.log('💳 Fatura Atual calculada:', {
      card_id: cardId,
      mes: currentMonth,
      transacoes: transactionsTotal,
      parcelas: installmentsTotal,
      total: transactionsTotal + installmentsTotal
    });
    
    return transactionsTotal + installmentsTotal;
  };

  const getInvoiceColor = (amount, limitOriginal) => {
    const percentage = (amount / limitOriginal) * 100;
    if (percentage >= 80) return '#ef4444';
    if (percentage >= 50) return '#eab308';
    return '#22c55e';
  };

  const monthlyExpense = utils.calculateMonthlyExpenses(transactionsHook.filteredTransactions, transactionsHook.filterMonth);
  const spendingProgress = settings.spendingLimit > 0 ? (monthlyExpense / settings.spendingLimit) * 100 : 0;
  const categoryData = utils.formatChartData(utils.getCategorySpending(transactionsHook.filteredTransactions));

  if (auth.loading) return <div className="loading">Carregando...</div>;

  if (!auth.user) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem', textAlign: 'center' }}>FinanceFlow</h1>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
            </div>
            <div className="form-group">
              <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
            </div>
            <button type="submit" disabled={authLoading} className="btn btn-primary" style={{ width: '100%' }}>
              {authLoading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>
          {authMessage && <div className={authMessage.includes('Erro') ? 'alert alert-danger' : 'alert alert-success'}>{authMessage}</div>}
          <button onClick={() => setIsSignUp(!isSignUp)} className="btn btn-secondary" style={{ width: '100%' }}>
            {isSignUp ? 'Ja tem conta? Entrar' : 'Nao tem conta? Cadastrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header style={{ background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>FinanceFlow</h1>
          <button onClick={auth.signOut} className="btn btn-danger btn-icon"><LogOut size={20} /></button>
        </div>
      </header>

      <nav className="tabs" style={{ maxWidth: '1400px', margin: '1rem auto', padding: '0 1rem' }}>
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'cards', label: 'Cartoes' },
          { id: 'transactions', label: 'Transacoes' },
          { id: 'bills', label: 'Contas' },
          { id: 'debts', label: 'Parcelados' },
          { id: 'invoices', label: 'Faturas' },
          { id: 'settings', label: 'Config' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'tab ' + (activeTab === tab.id ? 'tab-active' : '')}>{tab.label}</button>
        ))}
      </nav>

      <div className="main-content">
        {billsHook.upcomingBills.length > 0 && (
          <div className="alert alert-warning mb-4" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <AlertTriangle size={24} />
            <div>
              <p style={{ fontWeight: 'bold' }}>{billsHook.upcomingBills.length} conta(s) vencendo em 3 dias!</p>
              <p style={{ fontSize: '0.875rem' }}>{billsHook.upcomingBills.map(b => b.description).join(', ')}</p>
            </div>
          </div>
        )}

        {settings.spendingLimit > 0 && spendingProgress >= 80 && (
          <div className={'alert mb-4 ' + (spendingProgress >= 100 ? 'alert-danger' : 'alert-warning')} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <AlertCircle size={24} />
            <div>
              <p style={{ fontWeight: 'bold' }}>{spendingProgress >= 100 ? 'LIMITE EXCEDIDO!' : 'Atencao! Limite proximo'}</p>
              <p style={{ fontSize: '0.875rem' }}>Voce gastou {utils.formatCurrency(monthlyExpense)} de {utils.formatCurrency(settings.spendingLimit)}</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Salario</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(settings.salary)}</p>
              </div>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Meta de Gastos</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(settings.spendingLimit)}</p>
              </div>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1))' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Gastos do Mes</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(monthlyExpense)}</p>
              </div>
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Economia</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(settings.salary - monthlyExpense)}</p>
              </div>
            </div>

            {categoryData.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" label={(entry) => entry.name + ': ' + utils.formatCurrency(entry.value)}>
                      {categoryData.map((entry, index) => <Cell key={'cell-' + index} fill={utils.CHART_COLORS[index % utils.CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => utils.formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cards' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Meus Cartoes</h2>
              <button onClick={() => setShowCardModal(true)} className="btn btn-primary btn-icon"><Plus size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {cardsHook.cards.map(card => {
                const currentInvoice = calculateCurrentInvoice(card.id);
                
                // NOVA LÓGICA: Calcular limite corretamente
                const limitTotal = card.limit_original || card.credit_limit;  // Limite total do cartão
                const limitUsed = limitTotal - card.credit_limit;  // Quanto está usando
                const limitAvailable = card.credit_limit;  // Quanto tem disponível
                const usagePercentage = (limitUsed / limitTotal) * 100;
                
                const invoiceColor = getInvoiceColor(currentInvoice, limitTotal);
                
                return (
                  <div key={card.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>{card.name}</h3>
                      <button onClick={() => cardsHook.removeCard(card.id)} className="btn btn-danger btn-icon"><Trash2 size={16} /></button>
                    </div>
                    <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{card.type === 'credito' ? 'Credito' : 'Debito'}</p>
                    {card.type === 'credito' && (
                      <>
                        {/* Barra de progresso */}
                        <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                          <div 
                            className={'progress-fill ' + (usagePercentage >= 80 ? 'progress-danger' : usagePercentage >= 50 ? 'progress-warning' : 'progress-success')} 
                            style={{ width: Math.min(usagePercentage, 100) + '%' }} 
                          />
                        </div>
                        
                        {/* Linha com Limite e Disponível */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          <span style={{ color: 'rgb(148, 163, 184)' }}>
                            Limite: {utils.formatCurrency(limitAvailable)} / {utils.formatCurrency(limitTotal)}
                          </span>
                          <span style={{ color: usagePercentage >= 80 ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                            {usagePercentage.toFixed(0)}% usado
                          </span>
                        </div>
                        
                        {/* Card da Fatura Atual */}
                        <div style={{ 
                          padding: '0.75rem', 
                          background: 'rgba(0,0,0,0.2)', 
                          borderRadius: '8px', 
                          borderLeft: '4px solid ' + invoiceColor,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Fatura Atual</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: invoiceColor }}>{utils.formatCurrency(currentInvoice)}</p>
                          </div>
                          <button 
                            onClick={() => openInvoiceDetails({ id: null, card_id: card.id, month: utils.getCurrentMonth() })}
                            className="btn btn-secondary btn-icon"
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Transacoes</h2>
              <button onClick={() => { setEditingTransaction(null); setShowTransactionModal(true); }} className="btn btn-primary btn-icon"><Plus size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Buscar..." value={transactionsHook.searchTerm} onChange={(e) => transactionsHook.setSearchTerm(e.target.value)} className="input" />
              <input type="month" value={transactionsHook.filterMonth} onChange={(e) => transactionsHook.setFilterMonth(e.target.value)} className="input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transactionsHook.filteredTransactions.map(t => (
                <div key={t.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 'bold', color: 'white' }}>{t.description}</p>
                      <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)' }}>{t.category} - {t.method} - {utils.formatDate(t.transaction_date)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <p style={{ fontWeight: 'bold', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>{t.type === 'income' ? '+' : '-'} {utils.formatCurrency(t.amount)}</p>
                      <button onClick={() => startEditTransaction(t)} className="btn btn-secondary btn-icon"><Edit size={16} /></button>
                      <button onClick={() => transactionsHook.removeTransaction(t.id)} className="btn btn-danger btn-icon"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Contas a Pagar</h2>
              <button onClick={() => setShowBillModal(true)} className="btn btn-primary btn-icon"><Plus size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {billsHook.bills.map(bill => (
                <div key={bill.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 'bold', color: 'white' }}>{bill.description}</p>
                      <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)' }}>
                        Vencimento: {utils.formatDate(bill.due_date)} - {utils.getDaysUntilDate(bill.due_date) > 0 ? utils.getDaysUntilDate(bill.due_date) + ' dias' : 'Vencido!'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <p style={{ fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(bill.amount)}</p>
                      <select value={bill.status} onChange={(e) => billsHook.updateStatus(bill.id, e.target.value)} className="select" style={{ width: 'auto' }}>
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                      </select>
                      <button onClick={() => billsHook.removeBill(bill.id)} className="btn btn-danger btn-icon"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'debts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Compras Parceladas</h2>
              <button onClick={() => setShowDebtModal(true)} className="btn btn-primary btn-icon"><Plus size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {debtsHook.debts.map(debt => {
                const card = cardsHook.cards.find(c => c.id === debt.card_id);
                return (
                  <div key={debt.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>{debt.description}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)' }}>
                          {debt.paid_installments >= debt.total_installments ? (
                            <span>✅ {debt.total_installments}/{debt.total_installments} parcelas pagas (Quitado)</span>
                          ) : (
                            <span>Próxima: {debt.paid_installments + 1}/{debt.total_installments} • {debt.paid_installments} pagas</span>
                          )}
                          {card && <span> • Cartao: {card.name}</span>}
                        </p>
                      </div>
                      <button onClick={() => debtsHook.removeDebt(debt.id)} className="btn btn-danger btn-icon"><Trash2 size={16} /></button>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                      <div className="progress-fill progress-success" style={{ width: utils.calculateInstallmentProgress(debt) + '%' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <p style={{ color: 'rgb(148, 163, 184)' }}>Total</p>
                        <p style={{ fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(debt.total_value)}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgb(148, 163, 184)' }}>Parcela</p>
                        <p style={{ fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(debt.monthly_value)}</p>
                      </div>
                      <div>
                        <p style={{ color: 'rgb(148, 163, 184)' }}>Restante</p>
                        <p style={{ fontWeight: 'bold', color: '#ef4444' }}>{utils.formatCurrency(utils.calculateRemainingDebt(debt))}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Faturas dos Cartoes</h2>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <p style={{ fontWeight: 'bold' }}>Sistema de Faturas - Uma por Mês</p>
              <p style={{ fontSize: '0.875rem' }}>
                • Gere a fatura do mês para visualizar todos os gastos<br/>
                • Cada cartão pode ter apenas 1 fatura por mês<br/>
                • Após pagar, aguarde o próximo mês para gerar nova fatura<br/>
                • As parcelas caem automaticamente todo mês
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {cardsHook.cards.filter(c => c.type === 'credito').map(card => {
                // Verificar se já existe fatura para este cartão neste mês
                const currentMonth = utils.getCurrentMonth();
                const existingInvoice = invoicesHook.invoices.find(
                  inv => inv.card_id === card.id && inv.month === currentMonth
                );
                
                return (
                  <div key={card.id} className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>{card.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)', marginBottom: '1rem' }}>
                      Mês: {utils.formatMonth(currentMonth)}
                    </p>
                    
                    {existingInvoice ? (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: existingInvoice.status === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                        borderRadius: '6px',
                        border: '1px solid ' + (existingInvoice.status === 'paid' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(139, 92, 246, 0.3)'),
                        textAlign: 'center'
                      }}>
                        <p style={{ 
                          color: existingInvoice.status === 'paid' ? '#22c55e' : '#a78bfa', 
                          fontSize: '0.875rem', 
                          fontWeight: 'bold',
                          margin: 0 
                        }}>
                          {existingInvoice.status === 'paid' ? '✅ Fatura já paga este mês' : '📋 Fatura já gerada'}
                        </p>
                        <p style={{ 
                          color: 'rgb(148, 163, 184)', 
                          fontSize: '0.75rem',
                          marginTop: '0.25rem',
                          marginBottom: 0
                        }}>
                          {existingInvoice.status === 'paid' 
                            ? 'Aguarde o próximo mês para gerar nova fatura' 
                            : 'Visualize nos detalhes abaixo ou pague a fatura'}
                        </p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleGenerateInvoice(card.id)} 
                        className="btn btn-primary" 
                        style={{ width: '100%' }}
                      >
                        Gerar Fatura do Mes
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Historico de Faturas</h3>
              <button 
                onClick={() => invoicesHook.reload()} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                🔄 Atualizar
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {invoicesHook.invoices.map(invoice => {
                const card = cardsHook.cards.find(c => c.id === invoice.card_id);
                const isPaid = invoice.status === 'paid';
                return (
                  <div key={invoice.id} className="card" style={{ padding: '1rem', borderLeft: isPaid ? '4px solid #22c55e' : '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', color: 'white' }}>{card?.name} - {utils.formatMonth(invoice.month)}</p>
                        <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)' }}>
                          Vencimento: {utils.formatDate(invoice.due_date)} - 
                          <span className={'badge ' + (isPaid ? 'badge-success' : invoice.status === 'closed' ? 'badge-warning' : 'badge-danger')} style={{ marginLeft: '0.5rem' }}>
                            {utils.getStatusIcon(invoice.status)} {isPaid ? 'Paga' : invoice.status === 'closed' ? 'Fechada' : 'Aberta'}
                          </span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(invoice.total_amount)}</p>
                        <button onClick={() => openInvoiceDetails(invoice)} className="btn btn-secondary btn-icon" title="Ver detalhes">
                          <Eye size={16} />
                        </button>
                        {isPaid ? (
                          <div style={{ 
                            padding: '0.5rem 1rem', 
                            background: 'rgba(34, 197, 94, 0.2)', 
                            borderRadius: '6px',
                            border: '1px solid rgba(34, 197, 94, 0.5)'
                          }}>
                            <p style={{ color: '#22c55e', fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>✅ Fatura Paga</p>
                          </div>
                        ) : (
                          <button onClick={() => { setSelectedInvoice(invoice); setShowInvoiceModal(true); }} className="btn btn-success">Pagar</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Configuracoes</h2>
            <div className="form-group">
              <label className="form-label">Salario Mensal</label>
              <input type="text" value={salaryInput} onChange={handleSalaryChange} className="input" placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Meta de Gastos Mensais</label>
              <input type="text" value={spendingLimitInput} onChange={handleSpendingLimitChange} className="input" placeholder="0,00" />
              <p style={{ fontSize: '0.875rem', color: 'rgb(148, 163, 184)', marginTop: '0.5rem' }}>Receba alertas quando atingir 80% desta meta</p>
            </div>
            <div className="form-group">
              <label className="form-label">Meta de Poupanca</label>
              <input type="text" value={savingGoalInput} onChange={handleSavingGoalChange} className="input" placeholder="0,00" />
            </div>

            <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }} />
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>📊 Extrato Mensal</h3>
            
            <div className="form-group">
              <label className="form-label">Selecionar Mês</label>
              <input 
                type="month" 
                value={transactionsHook.filterMonth} 
                onChange={(e) => transactionsHook.setFilterMonth(e.target.value)} 
                className="input" 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Receitas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                  {utils.formatCurrency(
                    transactionsHook.filteredTransactions
                      .filter(t => t.type === 'income')
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                  )}
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Despesas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {utils.formatCurrency(
                    transactionsHook.filteredTransactions
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                  )}
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Saldo</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {utils.formatCurrency(
                    transactionsHook.filteredTransactions
                      .filter(t => t.type === 'income')
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0) -
                    transactionsHook.filteredTransactions
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                  )}
                </p>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '0.75rem' }}>Transações do Mês</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                {transactionsHook.filteredTransactions.length === 0 ? (
                  <p style={{ color: 'rgb(148, 163, 184)', textAlign: 'center', padding: '2rem' }}>Nenhuma transação neste mês</p>
                ) : (
                  transactionsHook.filteredTransactions.map(t => (
                    <div key={t.id} style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: '4px solid ' + (t.type === 'income' ? '#22c55e' : '#ef4444')
                    }}>
                      <div>
                        <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{t.description}</p>
                        <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.75rem' }}>
                          {t.category} • {t.method} • {utils.formatDate(t.transaction_date)}
                        </p>
                      </div>
                      <p style={{ fontWeight: 'bold', fontSize: '1.125rem', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {t.type === 'income' ? '+' : '-'} {utils.formatCurrency(t.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Cartao</h3>
              <button onClick={() => setShowCardModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCard} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input type="text" value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} className="input" placeholder="Ex: Nubank" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select value={newCard.type} onChange={(e) => setNewCard({ ...newCard, type: e.target.value })} className="select">
                  <option value="credito">Credito</option>
                  <option value="debito">Debito</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Limite</label>
                <input type="number" value={newCard.credit_limit} onChange={(e) => setNewCard({ ...newCard, credit_limit: e.target.value })} className="input" placeholder="0.00" step="0.01" required />
              </div>
              {newCard.type === 'credito' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Dia de Vencimento</label>
                    <input type="number" value={newCard.due_day} onChange={(e) => setNewCard({ ...newCard, due_day: parseInt(e.target.value) })} className="input" min="1" max="31" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dia de Fechamento</label>
                    <input type="number" value={newCard.closing_day} onChange={(e) => setNewCard({ ...newCard, closing_day: parseInt(e.target.value) })} className="input" min="1" max="31" />
                  </div>
                </>
              )}
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Adicionar</button>
                <button type="button" onClick={() => setShowCardModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTransaction ? 'Editar' : 'Nova'} Transacao</h3>
              <button onClick={() => setShowTransactionModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTransaction} className="modal-body">
              <div className="form-group">
                <label className="form-label">Descricao</label>
                <input type="text" value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} className="input" placeholder="Ex: Supermercado" required />
              </div>
              <div className="form-group">
                <label className="form-label">Valor</label>
                <input type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} className="input" placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select value={newTransaction.type} onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })} className="select">
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Metodo</label>
                <select value={newTransaction.method} onChange={(e) => setNewTransaction({ ...newTransaction, method: e.target.value })} className="select">
                  <option value="pix">PIX</option>
                  <option value="credito">Credito</option>
                  <option value="debito">Debito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>
              {(newTransaction.method === 'credito' || newTransaction.method === 'debito') && (
                <div className="form-group">
                  <label className="form-label">Cartao</label>
                  <select value={newTransaction.cardId} onChange={(e) => setNewTransaction({ ...newTransaction, cardId: e.target.value })} className="select">
                    <option value="">Selecione</option>
                    {cardsHook.cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <input type="text" value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })} className="input" placeholder="Ex: Alimentacao" />
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editingTransaction ? 'Atualizar' : 'Adicionar'}</button>
                <button type="button" onClick={() => setShowTransactionModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Conta</h3>
              <button onClick={() => setShowBillModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddBill} className="modal-body">
              <div className="form-group">
                <label className="form-label">Descricao</label>
                <input type="text" value={newBill.description} onChange={(e) => setNewBill({ ...newBill, description: e.target.value })} className="input" placeholder="Ex: Conta de luz" required />
              </div>
              <div className="form-group">
                <label className="form-label">Valor</label>
                <input type="number" value={newBill.amount} onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })} className="input" placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-group">
                <label className="form-label">Vencimento</label>
                <input type="date" value={newBill.due_date} onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })} className="input" required />
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Adicionar</button>
                <button type="button" onClick={() => setShowBillModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDebtModal && (
        <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Divida Parcelada</h3>
              <button onClick={() => setShowDebtModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddDebt} className="modal-body">
              <div className="form-group">
                <label className="form-label">Descricao</label>
                <input type="text" value={newDebt.description} onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })} className="input" placeholder="Ex: TV Samsung" required />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Total</label>
                <input type="number" value={newDebt.total_value} onChange={(e) => setNewDebt({ ...newDebt, total_value: e.target.value })} className="input" placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-group">
                <label className="form-label">Numero de Parcelas</label>
                <input type="number" value={newDebt.total_installments} onChange={(e) => setNewDebt({ ...newDebt, total_installments: e.target.value })} className="input" placeholder="12" min="1" required />
              </div>
              <div className="form-group">
                <label className="form-label">Parcelas Ja Pagas</label>
                <input type="number" value={newDebt.paid_installments} onChange={(e) => setNewDebt({ ...newDebt, paid_installments: e.target.value })} className="input" placeholder="0" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Metodo de Pagamento</label>
                <select value={newDebt.payment_method} onChange={(e) => setNewDebt({ ...newDebt, payment_method: e.target.value })} className="select">
                  <option value="cartao">Cartao de Credito</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>
              {newDebt.payment_method === 'cartao' && (
                <div className="form-group">
                  <label className="form-label">Cartao</label>
                  <select value={newDebt.card_id} onChange={(e) => setNewDebt({ ...newDebt, card_id: e.target.value })} className="select" required>
                    <option value="">Selecione</option>
                    {cardsHook.cards.filter(c => c.type === 'credito').map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Adicionar</button>
                <button type="button" onClick={() => setShowDebtModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Pagar Fatura</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: 'bold' }}>Confirmar pagamento da fatura?</p>
                <p style={{ fontSize: '0.875rem' }}>Isso vai restaurar o limite do cartao e atualizar as parcelas automaticamente.</p>
              </div>
              <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Valor Total</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{utils.formatCurrency(selectedInvoice.total_amount)}</p>
              </div>
              <div className="modal-footer">
                <button onClick={handlePayInvoice} className="btn btn-success">Confirmar Pagamento</button>
                <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoiceDetailsModal && selectedInvoiceForDetails && (
        <div className="modal-overlay" onClick={() => setShowInvoiceDetailsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Fatura</h3>
              <button onClick={() => setShowInvoiceDetailsModal(false)} className="btn btn-secondary btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <InvoiceDetailsContent 
                cardId={selectedInvoiceForDetails.card_id} 
                month={selectedInvoiceForDetails.month}
                transactions={transactionsHook.transactions}
                debts={debtsHook.debts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetailsContent({ cardId, month, transactions, debts }) {
  const monthTransactions = transactions.filter(t => 
    t.card_id === cardId && 
    t.method === 'credito' && 
    t.type === 'expense' &&
    t.transaction_date.startsWith(month)
  );
  
  const monthDebts = debts.filter(d => d.card_id === cardId).filter(debt => {
    const monthsSinceStart = utils.getMonthsDifference(debt.start_month, month);
    const installmentNumber = monthsSinceStart + 1;
    return installmentNumber > debt.paid_installments && installmentNumber <= debt.total_installments;
  }).map(debt => ({
    ...debt,
    installment_number: utils.getMonthsDifference(debt.start_month, month) + 1
  }));
  
  const transactionsTotal = monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const debtsTotal = monthDebts.reduce((sum, d) => sum + parseFloat(d.monthly_value), 0);
  const total = transactionsTotal + debtsTotal;
  
  return (
    <div>
      {monthTransactions.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Transacoes do Mes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {monthTransactions.map(t => (
              <div key={t.id} style={{ 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{t.description}</p>
                  <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.75rem' }}>{t.category} - {utils.formatDate(t.transaction_date)}</p>
                </div>
                <p style={{ color: 'white', fontWeight: 'bold' }}>{utils.formatCurrency(t.amount)}</p>
              </div>
            ))}
          </div>
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            background: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem' }}>Subtotal Transacoes:</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{utils.formatCurrency(transactionsTotal)}</span>
          </div>
        </div>
      )}
      
      {monthDebts.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Parcelas do Mes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {monthDebts.map(d => (
              <div key={d.id} style={{ 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{d.description}</p>
                  <p style={{ color: 'rgb(148, 163, 184)', fontSize: '0.75rem' }}>Parcela {d.installment_number}/{d.total_installments}</p>
                </div>
                <p style={{ color: 'white', fontWeight: 'bold' }}>{utils.formatCurrency(d.monthly_value)}</p>
              </div>
            ))}
          </div>
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            background: 'rgba(139, 92, 246, 0.1)', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'rgb(148, 163, 184)', fontSize: '0.875rem' }}>Subtotal Parcelas:</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{utils.formatCurrency(debtsTotal)}</span>
          </div>
        </div>
      )}
      
      {monthTransactions.length === 0 && monthDebts.length === 0 && (
        <div className="alert alert-info">
          <p style={{ fontSize: '0.875rem' }}>Nenhuma transacao ou parcela neste mes.</p>
        </div>
      )}
      
      <div style={{ 
        padding: '1rem', 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))',
        borderRadius: '8px',
        borderTop: '2px solid rgb(139, 92, 246)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontSize: '1.125rem', fontWeight: 'bold' }}>TOTAL DA FATURA</span>
          <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>{utils.formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
