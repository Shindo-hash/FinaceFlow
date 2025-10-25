// ═══════════════════════════════════════════════════════════════
// 🛠️ UTILS - Funções Auxiliares e Cálculos
// ═══════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 FORMATAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const formatCurrency = (value) => {
  return `R$ ${parseFloat(value).toFixed(2)}`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatMonth = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 DATAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

export const getNextMonth = (currentMonth) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const nextDate = new Date(year, month, 1); // month já é +1 por causa do índice 0
  return nextDate.toISOString().slice(0, 7);
};

export const getPreviousMonth = (currentMonth) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1); // -2 porque índice começa em 0
  return prevDate.toISOString().slice(0, 7);
};

export const calculateDueDate = (card, month) => {
  const [year, monthNum] = month.split('-').map(Number);
  const dueDay = card.due_day || 10;
  return `${year}-${String(monthNum).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
};

export const calculateClosingDate = (card, month) => {
  const [year, monthNum] = month.split('-').map(Number);
  const closingDay = card.closing_day || 5;
  return `${year}-${String(monthNum).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;
};

export const getDaysUntilDate = (targetDate) => {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 CÁLCULOS FINANCEIROS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const calculateTotalExpenses = (transactions) => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
};

export const calculateTotalIncome = (transactions) => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
};

export const calculateMonthlyExpenses = (transactions, month) => {
  return transactions
    .filter(t => t.type === 'expense' && t.transaction_date.startsWith(month))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
};

export const calculateCardUsage = (card) => {
  if (!card.limit_original || card.limit_original === 0) return 0;
  const used = card.limit_original - card.credit_limit;
  return (used / card.limit_original) * 100;
};

export const calculateInstallmentProgress = (debt) => {
  if (!debt.total_installments || debt.total_installments === 0) return 0;
  return (debt.paid_installments / debt.total_installments) * 100;
};

export const calculateRemainingDebt = (debt) => {
  const remaining = debt.total_installments - debt.paid_installments;
  return remaining * debt.monthly_value;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💳 FATURAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getMonthlyInstallmentsForCard = (debts, cardId, month) => {
  const installments = [];
  
  for (const debt of debts) {
    if (debt.card_id !== cardId) continue;
    if (debt.paid_installments >= debt.total_installments) continue;
    
    // Calcular qual parcela cai neste mês
    const startMonth = new Date(debt.start_month);
    const currentMonth = new Date(month + '-01');
    const monthsDiff = (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 
                     + (currentMonth.getMonth() - startMonth.getMonth());
    
    // A parcela que cai ESTE mês considerando as já pagas
    // Se paid_installments = 0, primeira parcela cai no mês de start_month (monthsDiff = 0, installmentNumber = 1)
    // Se paid_installments = 5, sexta parcela cai quando monthsDiff = 5 (installmentNumber = 6)
    const installmentNumber = monthsDiff + 1;
    
    // Verificar se esta parcela já foi paga ou é futura
    if (installmentNumber <= debt.paid_installments) continue;
    if (installmentNumber > debt.total_installments) continue;
    
    installments.push({
      debt_id: debt.id,
      description: debt.description,
      amount: debt.monthly_value,
      installment_number: installmentNumber,
      total_installments: debt.total_installments
    });
  }
  
  return installments;
};

export const calculateInvoiceTotal = (transactions, installments) => {
  const transTotal = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const instTotal = installments.reduce((sum, i) => sum + (i.amount || 0), 0);
  return transTotal + instTotal;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 RECOMENDAÇÕES E ALERTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const generateRecommendations = (totalExpense, salary, categorySpending, topCategory) => {
  const recommendations = [];
  const percentage = (totalExpense / salary) * 100;

  if (percentage > 90) {
    recommendations.push({
      type: 'danger',
      text: '⚠️ ALERTA! Você gastou mais de 90% do seu salário!'
    });
  } else if (percentage > 70) {
    recommendations.push({
      type: 'warning',
      text: '⚠️ Atenção! Seus gastos estão altos (acima de 70%)'
    });
  }

  if (topCategory && categorySpending[topCategory]) {
    const categoryPercent = (categorySpending[topCategory] / totalExpense) * 100;
    if (categoryPercent > 30) {
      recommendations.push({
        type: 'info',
        text: `💡 ${categoryPercent.toFixed(0)}% dos gastos foram em ${topCategory}. Considere revisar!`
      });
    }
  }

  if (percentage < 50) {
    recommendations.push({
      type: 'success',
      text: '🎉 Parabéns! Você gastou menos de 50% do seu salário!'
    });
  }

  return recommendations;
};

export const getUpcomingBills = (bills, daysAhead = 3) => {
  return bills.filter(b => {
    const daysUntil = getDaysUntilDate(b.due_date);
    return daysUntil >= 0 && daysUntil <= daysAhead && b.status === 'pending';
  });
};

export const checkSpendingLimit = (monthlyExpense, spendingLimit) => {
  if (!spendingLimit || spendingLimit === 0) return null;
  
  const percentage = (monthlyExpense / spendingLimit) * 100;
  
  if (percentage >= 100) {
    return { level: 'danger', message: '🚨 Você ultrapassou seu limite de gastos!' };
  } else if (percentage >= 80) {
    return { level: 'warning', message: '⚠️ Você está próximo do limite de gastos (80%)' };
  } else if (percentage >= 50) {
    return { level: 'info', message: '💡 Você já gastou metade do seu limite' };
  }
  
  return null;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 DADOS PARA GRÁFICOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getCategorySpending = (transactions) => {
  const spending = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const category = t.category || 'Sem categoria';
      spending[category] = (spending[category] || 0) + (t.amount || 0);
    });
  return spending;
};

export const getMethodSpending = (transactions) => {
  const spending = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const method = t.method || 'outro';
      spending[method] = (spending[method] || 0) + (t.amount || 0);
    });
  return spending;
};

export const formatChartData = (dataObj) => {
  return Object.entries(dataObj).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  }));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 CORES E VISUAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export const getStatusColor = (status) => {
  const colors = {
    open: 'red',
    closed: 'orange',
    paid: 'green',
    pending: 'yellow'
  };
  return colors[status] || 'gray';
};

export const getStatusIcon = (status) => {
  const icons = {
    open: '🔴',
    closed: '🟠',
    paid: '✅',
    pending: '⏳'
  };
  return icons[status] || '❓';
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 FILTROS E BUSCA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const filterTransactionsBySearch = (transactions, searchTerm) => {
  if (!searchTerm) return transactions;
  
  const term = searchTerm.toLowerCase();
  return transactions.filter(t =>
    t.description.toLowerCase().includes(term) ||
    (t.category && t.category.toLowerCase().includes(term))
  );
};

export const filterTransactionsByMonth = (transactions, month) => {
  if (!month) return transactions;
  return transactions.filter(t => t.transaction_date.startsWith(month));
};

export const filterTransactions = (transactions, searchTerm, month) => {
  let filtered = transactions;
  
  if (searchTerm) {
    filtered = filterTransactionsBySearch(filtered, searchTerm);
  }
  
  if (month) {
    filtered = filterTransactionsByMonth(filtered, month);
  }
  
  return filtered;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 FUNÇÕES DE DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getMonthsDifference = (startMonth, currentMonth) => {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [currentYear, currentM] = currentMonth.split('-').map(Number);
  return (currentYear - startYear) * 12 + (currentM - startM);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💵 FORMATAÇÃO DE INPUT DE MOEDA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const formatCurrencyInput = (value) => {
  if (!value || value === 0) return '0,00';
  const numValue = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : value;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue / 100);
};

export const parseCurrencyInput = (value) => {
  if (!value) return 0;
  const cleaned = value.replace(/\D/g, '');
  return parseInt(cleaned) || 0;
};
