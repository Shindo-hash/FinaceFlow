// ═══════════════════════════════════════════════════════════════
// 🔥 SUPABASE - Configuração + Todas as Funções do Banco
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dkuacytbchewndsglydu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hhYkbTw-sfMchyT8iwN3DQ_biU0KeSB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 AUTENTICAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👤 USER SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

export const updateUserSettings = async (userId, settings) => {
  const { data: existing } = await fetchUserSettings(userId);
  
  if (existing) {
    const { data, error } = await supabase
      .from('user_settings')
      .update(settings)
      .eq('user_id', userId);
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('user_settings')
      .insert([{ user_id: userId, ...settings }]);
    return { data, error };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💳 CARTÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchCards = async (userId) => {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export const addCard = async (userId, cardData) => {
  const { data, error } = await supabase
    .from('cards')
    .insert([{
      user_id: userId,
      name: cardData.name,
      type: cardData.type,
      credit_limit: parseFloat(cardData.credit_limit),
      limit_original: parseFloat(cardData.credit_limit),
      due_day: parseInt(cardData.due_day) || 10,
      closing_day: parseInt(cardData.closing_day) || 5
    }])
    .select();
  return { data, error };
};

export const deleteCard = async (cardId) => {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId);
  return { error };
};

export const updateCardLimit = async (cardId, newLimit) => {
  const { data, error } = await supabase
    .from('cards')
    .update({ credit_limit: newLimit })
    .eq('id', cardId);
  return { data, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 TRANSAÇÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchTransactions = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });
  return { data, error };
};

export const addTransaction = async (userId, transactionData) => {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Inserir a transação
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      description: transactionData.description,
      amount: parseFloat(transactionData.amount),
      method: transactionData.method,
      type: transactionData.type,
      card_id: transactionData.cardId || null,
      category: transactionData.category || 'Sem categoria',
      transaction_date: today,
      created_at: new Date().toISOString()
    }])
    .select();
  
  // 2. Se for despesa no crédito, descontar do limite imediatamente
  if (!error && data && transactionData.method === 'credito' && transactionData.type === 'expense' && transactionData.cardId) {
    const amount = parseFloat(transactionData.amount);
    
    // Buscar limite atual
    const { data: cardData } = await supabase
      .from('cards')
      .select('credit_limit')
      .eq('id', transactionData.cardId)
      .single();
    
    if (cardData) {
      // Descontar do limite
      const newLimit = parseFloat(cardData.credit_limit) - amount;
      await supabase
        .from('cards')
        .update({ credit_limit: newLimit })
        .eq('id', transactionData.cardId);
    }
  }
  
  // 3. Se for receita no crédito, adicionar ao limite (estorno/crédito)
  if (!error && data && transactionData.method === 'credito' && transactionData.type === 'income' && transactionData.cardId) {
    const amount = parseFloat(transactionData.amount);
    
    const { data: cardData } = await supabase
      .from('cards')
      .select('credit_limit, limit_original')
      .eq('id', transactionData.cardId)
      .single();
    
    if (cardData) {
      // Adicionar ao limite (mas não ultrapassar o original)
      const newLimit = Math.min(
        parseFloat(cardData.credit_limit) + amount,
        parseFloat(cardData.limit_original)
      );
      await supabase
        .from('cards')
        .update({ credit_limit: newLimit })
        .eq('id', transactionData.cardId);
    }
  }
  
  return { data, error };
};

export const updateTransaction = async (transactionId, transactionData) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      description: transactionData.description,
      amount: parseFloat(transactionData.amount),
      method: transactionData.method,
      type: transactionData.type,
      card_id: transactionData.cardId || null,
      category: transactionData.category || 'Sem categoria'
    })
    .eq('id', transactionId)
    .select();
  return { data, error };
};

export const deleteTransaction = async (transactionId) => {
  // 1. Buscar a transação antes de deletar (para restaurar limite se necessário)
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  
  // 2. Deletar a transação
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  
  // 3. Se era despesa no crédito, restaurar o limite
  if (!error && transaction && transaction.method === 'credito' && transaction.type === 'expense' && transaction.card_id) {
    const { data: cardData } = await supabase
      .from('cards')
      .select('credit_limit, limit_original')
      .eq('id', transaction.card_id)
      .single();
    
    if (cardData) {
      const newLimit = Math.min(
        parseFloat(cardData.credit_limit) + parseFloat(transaction.amount),
        parseFloat(cardData.limit_original)
      );
      await supabase
        .from('cards')
        .update({ credit_limit: newLimit })
        .eq('id', transaction.card_id);
    }
  }
  
  return { error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧾 BOLETOS/CONTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchBills = async (userId) => {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });
  return { data, error };
};

export const addBill = async (userId, billData) => {
  const { data, error } = await supabase
    .from('bills')
    .insert([{
      user_id: userId,
      description: billData.description,
      amount: parseFloat(billData.amount),
      due_date: billData.due_date,
      status: billData.status || 'pending'
    }])
    .select();
  return { data, error };
};

export const deleteBill = async (billId) => {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', billId);
  return { error };
};

export const updateBillStatus = async (billId, status) => {
  const { data, error } = await supabase
    .from('bills')
    .update({ status })
    .eq('id', billId);
  return { data, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 DÍVIDAS PARCELADAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchDebts = async (userId) => {
  const { data, error } = await supabase
    .from('installment_debts')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export const addDebt = async (userId, debtData) => {
  const totalValue = parseFloat(debtData.total_value);
  const totalInstallments = parseInt(debtData.total_installments);
  const monthlyValue = totalValue / totalInstallments;
  const paidInstallments = parseInt(debtData.paid_installments) || 0;
  
  console.log('🔵 CRIANDO DÍVIDA:', {
    total_value: totalValue,
    total_installments: totalInstallments,
    paid_installments: paidInstallments,
    monthly_value: monthlyValue
  });
  
  // Calcular o mês de início REAL considerando parcelas já pagas
  // Se paid_installments = 0, start_month = mês atual
  // Se paid_installments = 5, start_month = 5 meses atrás
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - paidInstallments);
  const startMonth = currentDate.toISOString().slice(0, 7);
  
  // 1. Inserir a dívida parcelada
  const { data, error } = await supabase
    .from('installment_debts')
    .insert([{
      user_id: userId,
      card_id: debtData.card_id || null,
      description: debtData.description,
      total_value: totalValue,
      total_installments: totalInstallments,
      paid_installments: paidInstallments,
      monthly_value: monthlyValue,
      start_month: startMonth,
      payment_method: debtData.payment_method || 'cartao'
    }])
    .select();
  
  // 2. Se for cartão de crédito, descontar o VALOR TOTAL DAS PARCELAS RESTANTES do limite
  if (!error && data && debtData.card_id && debtData.payment_method === 'cartao') {
    // Calcular quantas parcelas faltam pagar
    const parcelasRestantes = totalInstallments - paidInstallments;
    const valorADescontar = monthlyValue * parcelasRestantes;
    
    console.log(`💳 CÁLCULO DO DESCONTO:`);
    console.log(`   - Total: R$ ${totalValue}`);
    console.log(`   - Parcelas totais: ${totalInstallments}`);
    console.log(`   - Parcelas pagas: ${paidInstallments}`);
    console.log(`   - Parcelas restantes: ${parcelasRestantes}`);
    console.log(`   - Valor por parcela: R$ ${monthlyValue.toFixed(2)}`);
    console.log(`   - Valor a descontar: R$ ${valorADescontar.toFixed(2)}`);
    
    if (parcelasRestantes <= 0) {
      console.log('⚠️ ATENÇÃO: Parcelas restantes <= 0! Não vai descontar do limite.');
      return { data, error };
    }
    
    // Buscar limite atual do cartão
    const { data: cardData } = await supabase
      .from('cards')
      .select('credit_limit')
      .eq('id', debtData.card_id)
      .single();
    
    if (cardData) {
      // Descontar o VALOR TOTAL das parcelas restantes
      const newLimit = parseFloat(cardData.credit_limit) - valorADescontar;
      console.log(`💳 ATUALIZANDO LIMITE:`);
      console.log(`   - Limite atual: R$ ${cardData.credit_limit}`);
      console.log(`   - Desconta: R$ ${valorADescontar.toFixed(2)}`);
      console.log(`   - Novo limite: R$ ${newLimit.toFixed(2)}`);
      
      const { error: updateError } = await supabase
        .from('cards')
        .update({ credit_limit: newLimit })
        .eq('id', debtData.card_id);
      
      if (updateError) {
        console.error('❌ ERRO ao atualizar limite:', updateError);
      } else {
        console.log('✅ Limite atualizado com sucesso!');
      }
    }
  }
  
  return { data, error };
};

export const deleteDebt = async (debtId) => {
  // 1. Buscar a dívida antes de deletar
  const { data: debt } = await supabase
    .from('installment_debts')
    .select('*')
    .eq('id', debtId)
    .single();
  
  // 2. Deletar a dívida
  const { error } = await supabase
    .from('installment_debts')
    .delete()
    .eq('id', debtId);
  
  // 3. Se era cartão de crédito, restaurar o limite das parcelas restantes
  if (!error && debt && debt.card_id && debt.payment_method === 'cartao') {
    const parcelasRestantes = debt.total_installments - debt.paid_installments;
    const valorARestaurar = parseFloat(debt.monthly_value) * parcelasRestantes;
    
    if (valorARestaurar > 0) {
      const { data: cardData } = await supabase
        .from('cards')
        .select('credit_limit, limit_original')
        .eq('id', debt.card_id)
        .single();
      
      if (cardData) {
        const newLimit = Math.min(
          parseFloat(cardData.credit_limit) + valorARestaurar,
          parseFloat(cardData.limit_original)
        );
        await supabase
          .from('cards')
          .update({ credit_limit: newLimit })
          .eq('id', debt.card_id);
      }
    }
  }
  
  return { error };
};

export const updateDebtPaidInstallments = async (debtId, paidInstallments) => {
  const { data, error } = await supabase
    .from('installment_debts')
    .update({ paid_installments: paidInstallments })
    .eq('id', debtId);
  return { data, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 FATURAS DE CARTÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchInvoices = async (userId) => {
  const { data, error } = await supabase
    .from('card_invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const fetchInvoiceDetails = async (invoiceId, cardId, month) => {
  // Buscar transações do cartão no mês
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('card_id', cardId)
    .eq('method', 'credito')
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)
    .order('transaction_date', { ascending: false });
  
  // Buscar parcelas do cartão que vencem no mês
  const { data: debts, error: debtsError } = await supabase
    .from('installment_debts')
    .select('*')
    .eq('card_id', cardId)
    .lte('start_month', month);
  
  // Filtrar parcelas que ainda não foram pagas completamente
  const activeDebts = (debts || []).filter(debt => {
    const monthsSinceStart = getMonthsDifference(debt.start_month, month);
    const installmentNumber = monthsSinceStart + 1;
    return installmentNumber > debt.paid_installments && installmentNumber <= debt.total_installments;
  }).map(debt => ({
    ...debt,
    installment_number: getMonthsDifference(debt.start_month, month) + 1
  }));
  
  return {
    transactions: transactions || [],
    debts: activeDebts,
    error: transError || debtsError
  };
};

// Função auxiliar para calcular diferença de meses
const getMonthsDifference = (startMonth, currentMonth) => {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [currentYear, currentM] = currentMonth.split('-').map(Number);
  return (currentYear - startYear) * 12 + (currentM - startM);
};

export const fetchInvoiceItems = async (invoiceId) => {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId);
  return { data, error };
};

export const createInvoice = async (userId, invoiceData) => {
  const { data, error } = await supabase
    .from('card_invoices')
    .insert([{
      user_id: userId,
      card_id: invoiceData.card_id,
      month: invoiceData.month,
      due_date: invoiceData.due_date,
      closing_date: invoiceData.closing_date,
      total_amount: invoiceData.total_amount,
      status: invoiceData.status || 'open'
    }])
    .select();
  return { data, error };
};

export const updateInvoiceStatus = async (invoiceId, status, amountPaid = null) => {
  const updateData = { status };
  if (amountPaid !== null) {
    updateData.amount_paid = amountPaid;
    updateData.paid_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('card_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select();  // ← ADICIONAR PARA RETORNAR DADOS ATUALIZADOS
  
  if (error) {
    console.error('❌ ERRO AO ATUALIZAR STATUS DA FATURA:', error);
  } else {
    console.log('✅ STATUS DA FATURA ATUALIZADO:', data);
  }
  
  return { data, error };
};

export const addInvoiceItem = async (userId, itemData) => {
  const { data, error } = await supabase
    .from('invoice_items')
    .insert([{
      user_id: userId,
      invoice_id: itemData.invoice_id,
      type: itemData.type,
      description: itemData.description,
      amount: parseFloat(itemData.amount),
      debt_id: itemData.debt_id || null,
      installment_number: itemData.installment_number || null,
      total_installments: itemData.total_installments || null,
      transaction_id: itemData.transaction_id || null
    }])
    .select();
  return { data, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIOS MENSAIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const fetchMonthlyReports = async (userId) => {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false });
  return { data, error };
};

export const addMonthlyReport = async (userId, reportData) => {
  const { data, error } = await supabase
    .from('monthly_reports')
    .insert([{
      user_id: userId,
      month: reportData.month,
      total_expense: reportData.total_expense,
      total_income: reportData.total_income,
      saved_amount: reportData.saved_amount,
      top_category: reportData.top_category,
      recommendations: JSON.stringify(reportData.recommendations)
    }])
    .select();
  return { data, error };
};

export const checkMonthlyReportExists = async (userId, month) => {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .single();
  return { data, error };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 ATUALIZAR FATURA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const updateInvoiceTotal = async (invoiceId, newTotal) => {
  const { data, error } = await supabase
    .from('card_invoices')
    .update({ total_amount: newTotal })
    .eq('id', invoiceId)
    .select();
  
  if (error) {
    console.error('❌ ERRO ao atualizar total da fatura:', error);
  } else {
    console.log('✅ Total da fatura atualizado:', data);
  }
  
  return { data, error };
};

export const deleteInvoiceItems = async (invoiceId) => {
  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);
  
  if (error) {
    console.error('❌ ERRO ao deletar itens da fatura:', error);
  } else {
    console.log('✅ Itens da fatura deletados');
  }
  
  return { error };
};
