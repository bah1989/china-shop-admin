import { useEffect, useState } from 'react'

const ADMIN_API = 'https://beoeatxlyddmouruqotg.supabase.co/functions/v1/admin-api'

const COLORS = {
  emerald: '#0A5C36',
  emeraldDark: '#173404',
  orange: '#FF6B00',
  bg: '#F3F4F1',
  card: '#FFFFFF',
  border: '#E3E2DD',
  textMuted: '#5F5E5A',
  textFaint: '#9A9A96',
}

const STATUS_LABELS = {
  pending: 'En attente',
  validated: 'Validée',
  grouped: 'Regroupée',
  dispatched: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}
const STATUS_OPTIONS = Object.keys(STATUS_LABELS)

async function call(password, action, payload) {
  const resp = await fetch(ADMIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, payload }),
  })
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  return data
}

export default function App() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [loginBusy, setLoginBusy] = useState(false)

  const [tab, setTab] = useState('orders')
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [partners, setPartners] = useState([])
  const [communes, setCommunes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginBusy(true)
    setLoginError(null)
    try {
      await call(password, 'stats')
      setLoggedIn(true)
    } catch (e) {
      setLoginError('Mot de passe incorrect')
    } finally {
      setLoginBusy(false)
    }
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [s, o, p, dp, c] = await Promise.all([
        call(password, 'stats'),
        call(password, 'list_orders'),
        call(password, 'list_products'),
        call(password, 'list_delivery_partners'),
        call(password, 'list_communes'),
      ])
      setStats(s.stats)
      setOrders(o.orders)
      setProducts(p.products)
      setPartners(dp.partners)
      setCommunes(c.communes)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loggedIn) refresh()
  }, [loggedIn])

  async function updateStatus(orderId, status) {
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status } : o)))
    try {
      await call(password, 'update_order_status', { order_id: orderId, status })
    } catch (e) {
      setError(e.message)
    }
  }

  async function saveProduct(product) {
    setSavingId(product.id)
    try {
      await call(password, 'update_product', {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        usage_link: product.usage_link,
        image_url: product.image_url,
        stock_qty: Number(product.stock_qty),
        retail_price: Number(product.retail_price),
        wholesale_price: Number(product.wholesale_price),
        is_active: product.is_active,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setS
