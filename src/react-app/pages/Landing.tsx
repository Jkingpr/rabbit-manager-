import { useNavigate } from 'react-router';
import { useState } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const features = [
    {
      icon: 'pets',
      title: 'Registro Completo de Conejos',
      description: 'Registra cada conejo con nombre, raza, peso, foto, fecha de nacimiento, padres y estado. Sistema de identificación por tatuajes en orejas.'
    },
    {
      icon: 'favorite',
      title: 'Control de Cruces Reproductivos',
      description: 'Planifica y registra cruces entre machos y hembras. Calcula automáticamente fechas de parto esperadas (31 días). Historial completo de apareamientos.'
    },
    {
      icon: 'child_care',
      title: 'Gestión de Camadas',
      description: 'Registra nacimientos con gazapos totales, vivos, muertos y fecha de destete. Sistema de IDs automáticos (YMMNN) para gazapos con iniciales de rancho.'
    },
    {
      icon: 'sell',
      title: 'Control de Ventas',
      description: 'Registra ventas con comprador, precio y fecha. Sección dedicada con total de ingresos y historial completo de conejos vendidos.'
    },
    {
      icon: 'payments',
      title: 'Control de Gastos',
      description: 'Gestiona gastos de alimento y medicinas. Filtra por tipo y período (semana/mes/año). Exporta reportes PDF con totales y detalles.'
    },
    {
      icon: 'scale',
      title: 'Historial de Peso',
      description: 'Registra el peso de cada conejo en libras con conversión automática a kg. Gráfica de línea para visualizar el crecimiento a lo largo del tiempo.'
    },
    {
      icon: 'family_restroom',
      title: 'Árbol Genealógico',
      description: 'Visualiza 3 generaciones completas: abuelos, padres, hermanos y descendencia. Información detallada con tatuajes de identificación.'
    },
    {
      icon: 'camera_alt',
      title: 'Fotos de Conejos',
      description: 'Toma fotos directamente desde la cámara o sube desde galería. Las fotos se muestran en tarjetas, detalles y PDFs exportados.'
    },
    {
      icon: 'picture_as_pdf',
      title: 'Exportación PDF',
      description: 'Exporta fichas individuales de conejos y cruces con diseño profesional. Incluye foto, genealogía, datos completos y logo de rancho.'
    },
    {
      icon: 'category',
      title: 'Razas Personalizadas',
      description: 'Además de razas ARBA estándar, agrega razas personalizadas para tu granja. Sistema flexible para cualquier tipo de crianza.'
    },
    {
      icon: 'notifications',
      title: 'Notificaciones Push',
      description: 'Recibe alertas días antes de partos y destetes importantes. Las notificaciones llegan incluso con el teléfono bloqueado.'
    }
  ];

  const benefits = [
    {
      icon: 'speed',
      title: 'Ahorra Tiempo',
      description: 'Olvídate de cuadernos y hojas de cálculo. Todo organizado en un solo lugar.'
    },
    {
      icon: 'trending_up',
      title: 'Mejora Productividad',
      description: 'Toma decisiones basadas en datos reales para optimizar tu crianza.'
    },
    {
      icon: 'security',
      title: 'Datos Seguros',
      description: 'Tu información protegida con encriptación y respaldos automáticos.'
    }
  ];

  const plans = [
    {
      id: 'free',
      name: 'Plan Gratis',
      icon: 'pets',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-800',
      hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-700',
      priceMonthly: 0,
      priceAnnual: 0,
      description: 'Ideal para empezar',
      limit: '10 conejos máximo',
      features: [
        'Hasta 10 conejos',
        'Registro completo',
        'Cruces ilimitados',
        'Control de camadas',
        'Árbol genealógico',
        'Notificaciones push',
        'Estadísticas básicas',
        'Exportación PDF'
      ]
    },
    {
      id: 'unlimited',
      name: 'Plan Ilimitado',
      icon: 'workspace_premium',
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      borderColor: 'border-primary-light/30',
      hoverBorder: 'hover:border-white/30',
      priceMonthly: 6.99,
      priceAnnual: 50,
      description: 'Para granjas profesionales',
      limit: 'Conejos ilimitados',
      recommended: true,
      features: [
        'Conejos ilimitados',
        'Cruces ilimitados',
        'Camadas ilimitadas',
        'Notificaciones avanzadas',
        'Estadísticas completas',
        'Exportación PDF profesional',
        'Control de gastos',
        'Control de ventas',
        'Historial de peso',
        'Razas personalizadas',
        'Soporte prioritario'
      ]
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.priceMonthly === 0) return 'Gratis';
    const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
    return `$${price}`;
  };

  const getPeriod = (plan: typeof plans[0]) => {
    if (plan.priceMonthly === 0) return '/mes';
    return billingPeriod === 'monthly' ? '/mes' : '/año';
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (billingPeriod === 'annual' && plan.priceMonthly > 0) {
      const monthlyCost = plan.priceMonthly * 12;
      const savings = monthlyCost - plan.priceAnnual;
      return `Ahorra $${savings.toFixed(2)}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/5 via-white to-primary/5 dark:from-gray-900 dark:via-background-dark dark:to-gray-900">
      {/* Header */}
      <header role="banner" className="fixed top-0 left-0 right-0 z-50 backdrop-blur-ios bg-white/90 dark:bg-background-dark/90 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center shadow-soft">
                <span className="material-icons-round text-white text-2xl">pets</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">CuniControl</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-xl font-semibold bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-soft"
              >
                Comenzar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section aria-label="Sección principal" className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold mb-6">
              <span className="material-icons-round text-sm">verified</span>
              <span>Sistema Profesional de Gestión Cunícola</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Gestiona tu
              <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent"> granja cunícola</span> de forma profesional
            </h1>
            
            <h2 className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Software completo para criadores de conejos: registra conejos, controla cruces reproductivos, gestiona camadas, ventas y gastos. Sistema profesional con notificaciones automáticas.
            </h2>
            
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Control completo de tu colonia: registro genealógico, cruces, camadas, ventas y notificaciones automáticas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-premium"
              >
                <span className="material-icons-round">rocket_launch</span>
                <span>Comenzar Gratis</span>
              </button>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl font-bold text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:scale-105 transition-all shadow-soft border border-gray-200 dark:border-gray-700"
              >
                <span className="material-icons-round">login</span>
                <span>Ya tengo cuenta</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Preview */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-light/30 to-primary/30 blur-3xl rounded-full"></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-premium p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-primary-light/10 to-primary/10 rounded-2xl p-4 sm:p-6 text-center">
                  <span className="material-icons-round text-primary text-3xl sm:text-4xl mb-2">pets</span>
                  <p className="font-bold text-xl sm:text-2xl text-gray-900 dark:text-white">156</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Conejos</p>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-2xl p-4 sm:p-6 text-center">
                  <span className="material-icons-round text-pink-600 text-3xl sm:text-4xl mb-2">favorite</span>
                  <p className="font-bold text-xl sm:text-2xl text-gray-900 dark:text-white">24</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Cruces</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-4 sm:p-6 text-center">
                  <span className="material-icons-round text-blue-600 text-3xl sm:text-4xl mb-2">child_care</span>
                  <p className="font-bold text-xl sm:text-2xl text-gray-900 dark:text-white">89</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Camadas</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl p-4 sm:p-6 text-center">
                  <span className="material-icons-round text-green-600 text-3xl sm:text-4xl mb-2">trending_up</span>
                  <p className="font-bold text-xl sm:text-2xl text-gray-900 dark:text-white">94%</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Supervivencia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Todo lo que necesitas para tu granja
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Sistema profesional diseñado específicamente para criadores de conejos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-soft hover:shadow-premium transition-all border border-gray-200 dark:border-gray-800 hover:scale-[1.02]"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-white text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-primary-light to-primary rounded-3xl p-8 sm:p-12 text-white shadow-premium">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                ¿Por qué elegir CuniControl?
              </h2>
              <p className="text-lg sm:text-xl text-white/80">
                Beneficios que marcan la diferencia en tu crianza
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                    <span className="material-icons-round text-white text-3xl">{benefit.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-white/80">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Planes y Precios
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Elige el plan que mejor se adapte a tu granja
            </p>

            {/* Billing Period Toggle */}
            <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-soft'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  billingPeriod === 'annual'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-soft'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Anual
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">Ahorra más</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-soft border-2 transition-all ${
                  plan.recommended
                    ? 'bg-gradient-to-br from-primary-light to-primary text-white transform hover:scale-[1.02] shadow-premium'
                    : `${plan.borderColor} ${plan.hoverBorder}`
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center space-x-1 px-4 py-2 rounded-full bg-yellow-400 text-gray-900 font-bold text-sm shadow-soft">
                      <span className="material-icons-round text-sm">star</span>
                      <span>Recomendado</span>
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                    plan.recommended ? plan.iconBg + ' backdrop-blur-sm' : plan.iconBg
                  }`}>
                    <span className={`material-icons-round text-3xl ${plan.iconColor}`}>{plan.icon}</span>
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${plan.recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-end justify-center mb-2">
                    <span className={`text-5xl font-bold ${plan.recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {getPrice(plan)}
                    </span>
                    <span className={`ml-2 mb-2 ${plan.recommended ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getPeriod(plan)}
                    </span>
                  </div>
                  {getSavings(plan) && (
                    <p className="text-sm font-semibold text-yellow-300 mb-2">{getSavings(plan)}</p>
                  )}
                  <p className={plan.recommended ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>
                    {plan.description}
                  </p>
                  <p className={`text-sm font-semibold mt-2 ${plan.recommended ? 'text-yellow-300' : 'text-primary'}`}>
                    {plan.limit}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <span className={`material-icons-round ${
                        plan.recommended ? 'text-yellow-300' : 'text-green-500'
                      }`}>check_circle</span>
                      <span className={plan.recommended ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' ? (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-4 rounded-2xl font-bold text-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Comenzar Gratis
                  </button>
                ) : plan.recommended ? (
                  <div className="space-y-3">
                    <a
                      href="https://wa.me/message/PGHOY7QEPFZGF1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-2xl font-bold text-lg bg-white text-primary hover:bg-white/90 transition-all shadow-soft flex items-center justify-center space-x-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span>Contactar por WhatsApp</span>
                    </a>
                  </div>
                ) : (
                  <a
                    href="https://wa.me/message/PGHOY7QEPFZGF1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-2xl font-bold text-lg bg-primary hover:bg-primary-dark text-white transition-all shadow-soft flex items-center justify-center space-x-2"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>Contactar por WhatsApp</span>
                  </a>
                )}
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-gray-500 dark:text-gray-400">
            Todos los planes incluyen sincronización en la nube y acceso desde cualquier dispositivo
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-primary-light/10 to-primary/10 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
                <span className="material-icons-round text-white text-3xl">inventory</span>
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-primary mb-2">100%</p>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">Control total de tu granja</p>
            </div>
            <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-primary-light/10 to-primary/10 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
                <span className="material-icons-round text-white text-3xl">speed</span>
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-primary mb-2">24/7</p>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">Acceso desde cualquier lugar</p>
            </div>
            <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-primary-light/10 to-primary/10 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
                <span className="material-icons-round text-white text-3xl">workspace_premium</span>
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-primary mb-2">11</p>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">Herramientas profesionales</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            ¿Listo para profesionalizar tu granja?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10">
            Únete a los criadores que ya están optimizando su producción con CuniControl
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-10 py-5 rounded-2xl font-bold text-xl bg-gradient-to-r from-primary-light to-primary text-white hover:scale-105 transition-all shadow-premium"
            >
              <span>Crear mi cuenta gratis</span>
              <span className="material-icons-round">arrow_forward</span>
            </button>
          </div>
          
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Sin tarjeta de crédito requerida • 1 mes gratis de prueba
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
              <span className="material-icons-round text-white text-lg">pets</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">CuniControl</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            © 2025 CuniControl. Sistema profesional de gestión cunícola.
          </p>
        </div>
      </footer>
    </div>
  );
}
