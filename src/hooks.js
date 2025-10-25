// ═══════════════════════════════════════════════════════════════
// 🪝 HOOKS - Custom Hooks para Lógica e Estados
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import * as db from './supabase';
import * as utils from './utils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 AUTENTICAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();

    // Listener de mudança de autenticação
    const { data: { subscription } } = db.supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { session } = await db.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    const { error } = await db.signUp(email, password);
    return { error };
  };

  const signIn = async (email, password) => {
    const { error } = await db.signIn(email, password);
    return { error };
  };

  const signOut = async () => {
    const { error } = await db.signOut();
    setUser(null);
    return { error };
  };

  return { user, loading, signUp, signIn, signOut };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👤 CONFIGURAÇÕES DO USUÁRIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useUserSettings = (userId) => {
  const [salary, setSalary] = useState(0);
  const [savingGoal, setSavingGoal] = useState(0);
  const [spendingLimit, setSpendingLimit] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSettings();
    }
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchUserSettings(userId);
      if (data) {
        setSalary(data.salary || 0);
        setSavingGoal(data.saving_goal || 0);
        setSpendingLimit(data.spending_limit || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSalary = async (value) => {
    setSalary(value);
    await db.updateUserSettings(userId, { salary: value });
  };

  const updateSavingGoal = async (value) => {
    setSavingGoal(value);
    await db.updateUserSettings(userId, { saving_goal: value });
  };

  const updateSpendingLimit = async (value) => {
    setSpendingLimit(value);
    await db.updateUserSettings(userId, { spending_limit: value });
  };

  return {
    salary,
    savingGoal,
    spendingLimit,
    loading,
    updateSalary,
    updateSavingGoal,
    updateSpendingLimit
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💳 CARTÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useCards = (userId) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadCards();
    }
  }, [userId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchCards(userId);
      setCards(data || []);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCard = async (cardData) => {
    console.log('🔵 Tentando adicionar cartão:', cardData);
    console.log('🔵 userId:', userId);
    const { data, error } = await db.addCard(userId, cardData);
    console.log('🔵 Resposta do banco:', { data, error });
    if (!error && data) {
      console.log('✅ Cartão adicionado com sucesso!', data[0]);
      setCards([...cards, data[0]]);
    } else {
      console.error('❌ Erro ao adicionar cartão:', error);
    }
    return { error };
  };

  const removeCard = async (cardId) => {
    const { error } = await db.deleteCard(cardId);
    if (!error) {
      setCards(cards.filter(c => c.id !== cardId));
    }
    return { error };
  };

  const updateLimit = async (cardId, newLimit) => {
    const { error } = await db.updateCardLimit(cardId, newLimit);
    if (!error) {
      setCards(cards.map(c => c.id === cardId ? { ...c, credit_limit: newLimit } : c));
    }
    return { error };
  };

  return { cards, loading, addCard, removeCard, updateLimit, reload: loadCards };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 TRANSAÇÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useTransactions = (userId) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(utils.getCurrentMonth());

  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchTransactions(userId);
      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transactionData) => {
    const { data, error } = await db.addTransaction(userId, transactionData);
    if (!error && data) {
      setTransactions([data[0], ...transactions]);
    }
    return { error };
  };

  const updateTransaction = async (transactionId, transactionData) => {
    const { data, error } = await db.updateTransaction(transactionId, transactionData);
    if (!error && data) {
      setTransactions(transactions.map(t => t.id === transactionId ? data[0] : t));
    }
    return { error };
  };

  const removeTransaction = async (transactionId) => {
    const { error } = await db.deleteTransaction(transactionId);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== transactionId));
    }
    return { error };
  };

  const filteredTransactions = utils.filterTransactions(transactions, searchTerm, filterMonth);

  return {
    transactions,
    filteredTransactions,
    loading,
    searchTerm,
    filterMonth,
    setSearchTerm,
    setFilterMonth,
    addTransaction,
    updateTransaction,
    removeTransaction,
    reload: loadTransactions
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧾 BOLETOS/CONTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useBills = (userId) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadBills();
    }
  }, [userId]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchBills(userId);
      setBills(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBill = async (billData) => {
    const { data, error } = await db.addBill(userId, billData);
    if (!error && data) {
      setBills([...bills, data[0]]);
    }
    return { error };
  };

  const removeBill = async (billId) => {
    const { error } = await db.deleteBill(billId);
    if (!error) {
      setBills(bills.filter(b => b.id !== billId));
    }
    return { error };
  };

  const updateStatus = async (billId, status) => {
    const { error } = await db.updateBillStatus(billId, status);
    if (!error) {
      setBills(bills.map(b => b.id === billId ? { ...b, status } : b));
    }
    return { error };
  };

  const upcomingBills = utils.getUpcomingBills(bills, 3);

  return { bills, upcomingBills, loading, addBill, removeBill, updateStatus, reload: loadBills };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 DÍVIDAS PARCELADAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useDebts = (userId) => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadDebts();
    }
  }, [userId]);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchDebts(userId);
      setDebts(data || []);
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDebt = async (debtData) => {
    const { data, error } = await db.addDebt(userId, debtData);
    if (!error && data) {
      // Recarregar do banco para pegar start_month calculado corretamente
      await loadDebts();
    }
    return { error };
  };

  const removeDebt = async (debtId) => {
    const { error } = await db.deleteDebt(debtId);
    if (!error) {
      setDebts(debts.filter(d => d.id !== debtId));
    }
    return { error };
  };

  const updatePaidInstallments = async (debtId, paidCount) => {
    const { error } = await db.updateDebtPaidInstallments(debtId, paidCount);
    if (!error) {
      setDebts(debts.map(d => d.id === debtId ? { ...d, paid_installments: paidCount } : d));
    }
    return { error };
  };

  return { debts, loading, addDebt, removeDebt, updatePaidInstallments, reload: loadDebts };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 FATURAS (NOVO SISTEMA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useInvoices = (userId, cards, transactions, debts) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadInvoices();
    }
  }, [userId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchInvoices(userId);
      setInvoices(data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (cardId, month) => {
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) return { error: 'Cartão não encontrado' };

      // Verificar se já existe uma fatura para este cartão neste mês
      const existingInvoice = invoices.find(
        inv => inv.card_id === cardId && inv.month === month
      );

      if (existingInvoice) {
        console.log('⚠️ Já existe uma fatura para este cartão neste mês');
        alert(`Já existe uma fatura para ${card.name} em ${month}. Você só pode gerar 1 fatura por mês!`);
        return { error: 'Fatura já existe para este mês' };
      }

      // Buscar transações do mês
      const monthTransactions = transactions.filter(
        t => t.card_id === cardId && 
        t.type === 'expense' && 
        t.transaction_date.startsWith(month)
      );

      // Buscar parcelas que caem neste mês
      const monthInstallments = utils.getMonthlyInstallmentsForCard(debts, cardId, month);

      // Calcular total
      const total = utils.calculateInvoiceTotal(monthTransactions, monthInstallments);

      console.log('📊 Criando fatura:', {
        cardId,
        month,
        transações: monthTransactions.length,
        parcelas: monthInstallments.length,
        total
      });

      // ✅ CRIAR NOVA FATURA
      console.log('✨ Criando nova fatura...');
      
      // Criar fatura
      const invoiceData = {
        card_id: cardId,
        month: month,
        due_date: utils.calculateDueDate(card, month),
        closing_date: utils.calculateClosingDate(card, month),
        total_amount: total,
        status: 'open'
      };

      const { data: invoice, error: invoiceError } = await db.createInvoice(userId, invoiceData);
      if (invoiceError) return { error: invoiceError };

      // Criar itens da fatura (transações)
      for (const trans of monthTransactions) {
        await db.addInvoiceItem(userId, {
          invoice_id: invoice[0].id,
          type: 'transaction',
          description: trans.description,
          amount: trans.amount,
          transaction_id: trans.id
        });
      }

      // Criar itens da fatura (parcelas)
      for (const inst of monthInstallments) {
        await db.addInvoiceItem(userId, {
          invoice_id: invoice[0].id,
          type: 'installment',
          description: `${inst.description} (${inst.installment_number}/${inst.total_installments})`,
          amount: inst.amount,
          debt_id: inst.debt_id,
          installment_number: inst.installment_number,
          total_installments: inst.total_installments
        });
      }

      await loadInvoices();
      console.log('✅ Fatura criada com sucesso!');
      return { data: invoice[0] };
    } catch (error) {
      console.error('❌ Erro ao gerar fatura:', error);
      return { error };
    }
  };

  const payInvoice = async (invoiceId, amount, onSuccess) => {
    try {
      console.log('🔵 Iniciando pagamento de fatura:', invoiceId);
      
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) return { error: 'Fatura não encontrada' };

      // Buscar itens da fatura
      const { data: items } = await db.fetchInvoiceItems(invoiceId);
      console.log('📋 Itens da fatura:', items);

      // Atualizar status da fatura
      console.log('💾 Atualizando status para PAID...');
      const { error: statusError } = await db.updateInvoiceStatus(invoiceId, 'paid', amount);
      if (statusError) {
        console.error('❌ ERRO ao atualizar status:', statusError);
        alert('ERRO: Não foi possível atualizar o status da fatura. Verifique as políticas do Supabase!');
        return { error: statusError };
      }
      console.log('✅ Status atualizado para PAID!');

      // Restaurar limite do cartão
      const card = cards.find(c => c.id === invoice.card_id);
      if (card) {
        // LÓGICA CORRETA:
        // - Transações de crédito: devolver 100% (foram pagas e deletadas)
        // - Parcelas: NÃO devolver! (ainda tem parcelas futuras reservadas)
        
        let valorTransacoes = 0;
        
        for (const item of items || []) {
          if (item.type === 'transaction') {
            valorTransacoes += parseFloat(item.amount);
          }
          // Parcelas NÃO são devolvidas aqui!
          // O valor já está reservado para as parcelas futuras
        }
        
        const limitOriginal = card.limit_original || card.credit_limit;
        const newLimit = Math.min(card.credit_limit + valorTransacoes, limitOriginal);
        
        console.log(`💳 Restaurando limite:`);
        console.log(`   - Transações pagas: R$ ${valorTransacoes} (devolve)`);
        console.log(`   - Parcelas: mantém reservado para parcelas futuras`);
        console.log(`   - Limite: R$ ${card.credit_limit} + R$ ${valorTransacoes} = R$ ${newLimit} (max: R$ ${limitOriginal})`);
        
        await db.updateCardLimit(invoice.card_id, newLimit);
      }

      // Processar itens da fatura
      for (const item of items || []) {
        // Atualizar parcelas pagas
        if (item.type === 'installment' && item.debt_id) {
          console.log(`📦 Atualizando parcela ${item.installment_number} da dívida ${item.debt_id}`);
          await db.updateDebtPaidInstallments(item.debt_id, item.installment_number);
        }
        
        // Deletar transações de crédito que foram pagas
        if (item.type === 'transaction' && item.transaction_id) {
          console.log(`🗑️ Deletando transação ${item.transaction_id}`);
          await db.deleteTransaction(item.transaction_id);
        }
      }

      // Registrar pagamento como transação
      console.log('💰 Registrando pagamento como transação...');
      await db.addTransaction(userId, {
        description: `Pagamento Fatura ${utils.formatMonth(invoice.month)}`,
        amount: amount,
        method: 'fatura',
        type: 'expense',
        category: 'Fatura Cartão',
        cardId: null
      });

      console.log('🔄 Recarregando faturas...');
      await loadInvoices();
      console.log('✅ Pagamento concluído com sucesso!');
      
      if (onSuccess) onSuccess();
      return { success: true };
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao pagar fatura:', error);
      alert('ERRO: ' + error.message);
      return { error };
    }
  };

  const closeInvoice = async (invoiceId) => {
    const { error } = await db.updateInvoiceStatus(invoiceId, 'closed');
    if (!error) {
      await loadInvoices();
    }
    return { error };
  };

  const reopenInvoice = async (invoiceId) => {
    const { error } = await db.updateInvoiceStatus(invoiceId, 'open');
    if (!error) {
      await loadInvoices();
    }
    return { error };
  };

  return {
    invoices,
    loading,
    generateInvoice,
    payInvoice,
    closeInvoice,
    reopenInvoice,
    reload: loadInvoices
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useMonthlyReports = (userId) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadReports();
    }
  }, [userId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await db.fetchMonthlyReports(userId);
      setReports(data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (month, transactions, salary) => {
    try {
      // Verificar se já existe relatório
      const { data: existing } = await db.checkMonthlyReportExists(userId, month);
      if (existing) return { error: 'Relatório já existe para este mês' };

      const monthTransactions = transactions.filter(t => 
        t.transaction_date.startsWith(month)
      );

      const totalExpense = utils.calculateTotalExpenses(monthTransactions);
      const totalIncome = utils.calculateTotalIncome(monthTransactions);
      const savedAmount = totalIncome - totalExpense;

      const categorySpending = utils.getCategorySpending(monthTransactions);
      const topCategory = Object.keys(categorySpending).reduce((a, b) => 
        categorySpending[a] > categorySpending[b] ? a : b
      , '');

      const recommendations = utils.generateRecommendations(
        totalExpense,
        salary,
        categorySpending,
        topCategory
      );

      const reportData = {
        month,
        total_expense: totalExpense,
        total_income: totalIncome,
        saved_amount: savedAmount,
        top_category: topCategory,
        recommendations
      };

      const { data, error } = await db.addMonthlyReport(userId, reportData);
      if (!error) {
        await loadReports();
      }
      return { data, error };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return { error };
    }
  };

  return { reports, loading, generateReport, reload: loadReports };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 DETALHES DA FATURA (NOVO!)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useInvoiceDetails = (invoiceId, cardId, month) => {
  const [details, setDetails] = useState({ transactions: [], debts: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      if (!invoiceId || !cardId || !month) return;
      
      setLoading(true);
      const result = await db.fetchInvoiceDetails(invoiceId, cardId, month);
      if (!result.error) {
        setDetails({
          transactions: result.transactions || [],
          debts: result.debts || []
        });
      }
      setLoading(false);
    };

    loadDetails();
  }, [invoiceId, cardId, month]);

  const getTotalTransactions = () => {
    return details.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  };

  const getTotalDebts = () => {
    return details.debts.reduce((sum, d) => sum + parseFloat(d.monthly_value), 0);
  };

  const getTotal = () => {
    return getTotalTransactions() + getTotalDebts();
  };

  return { 
    details, 
    loading, 
    getTotalTransactions, 
    getTotalDebts, 
    getTotal 
  };
};

