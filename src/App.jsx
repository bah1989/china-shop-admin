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
      setSavingId(null)
    }
  }

  function editProduct(id, field, value) {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const [uploadingId, setUploadingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function handleDeleteProduct(product) {
    if (!confirm(`Supprimer "${product.name}" ? Si l'article a déjà été commandé, il sera simplement désactivé.`)) return
    setDeletingId(product.id)
    setError(null)
    try {
      await call(password, 'delete_product', { id: product.id })
      setProducts((ps) => ps.filter((p) => p.id !== product.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }
  const [showNewForm, setShowNewForm] = useState(false)
  const [showNewPartnerForm, setShowNewPartnerForm] = useState(false)
  const [newPartner, setNewPartner] = useState({ name: '', phone: '', commune_id: '' })
  const [creatingPartner, setCreatingPartner] = useState(false)
  const [deletingPartnerId, setDeletingPartnerId] = useState(null)

  function editNewPartner(field, value) {
    setNewPartner((p) => ({ ...p, [field]: value }))
  }

  async function handleCreatePartner(e) {
    e.preventDefault()
    setCreatingPartner(true)
    setError(null)
    try {
      await call(password, 'create_delivery_partner', {
        name: newPartner.name,
        phone: newPartner.phone,
        commune_id: newPartner.commune_id,
      })
      setNewPartner({ name: '', phone: '', commune_id: '' })
      setShowNewPartnerForm(false)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreatingPartner(false)
    }
  }

  async function togglePartnerValidated(partner) {
    setPartners((ps) => ps.map((p) => (p.id === partner.id ? { ...p, is_validated: !p.is_validated } : p)))
    try {
      await call(password, 'update_delivery_partner', { id: partner.id, is_validated: !partner.is_validated })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeletePartner(partner) {
    if (!confirm(`Retirer ${partner.name} de l'équipe de livreurs ?`)) return
    setDeletingPartnerId(partner.id)
    try {
      await call(password, 'delete_delivery_partner', { id: partner.id })
      setPartners((ps) => ps.filter((p) => p.id !== partner.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingPartnerId(null)
    }
  }

  const [newProduct, setNewProduct] = useState({ name: '', description: '', category: '', usage_link: '', stock_qty: '', retail_price: '', wholesale_price: '' })
  const [creating, setCreating] = useState(false)

  function editNewProduct(field, value) {
    setNewProduct((p) => ({ ...p, [field]: value }))
  }

  async function handleCreateProduct(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await call(password, 'create_product', {
        name: newProduct.name,
        description: newProduct.description || null,
        category: newProduct.category || null,
        usage_link: newProduct.usage_link || null,
        stock_qty: Number(newProduct.stock_qty) || 0,
        retail_price: Number(newProduct.retail_price) || 0,
        wholesale_price: Number(newProduct.wholesale_price) || 0,
        is_active: true,
      })
      setNewProduct({ name: '', description: '', category: '', usage_link: '', stock_qty: '', retail_price: '', wholesale_price: '' })
      setShowNewForm(false)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  
async function handleImageUpload(product, file, slotIndex = 0) {
    if (!file) return
    setUploadingId(`${product.id}-${slotIndex}`)
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await call(password, 'upload_image', {
        productId: product.id,
        fileName: file.name,
        base64Data,
        contentType: file.type,
        slotIndex,
      })
      setProducts((ps) => ps.map((p) => {
        if (p.id !== product.id) return p
        const urls = [...(p.image_urls || [])]
        while (urls.length <= slotIndex) urls.push(null)
        urls[slotIndex] = result.url
        return { ...p, image_urls: urls, image_url: urls[0] || p.image_url }
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setUploadingId(null)
    }
  }
  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
        <form onSubmit={handleLogin} style={{ background: COLORS.card, borderRadius: 16, padding: 32, width: 320, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: COLORS.emerald }}>China Shop</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: COLORS.textMuted }}>Tableau de bord admin</p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: 'border-box' }}
            />
            <span
              onClick={() => setShowPassword((s) => !s)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: COLORS.textMuted, cursor: 'pointer', userSelect: 'none' }}
            >
              {showPassword ? 'Cacher' : 'Voir'}
            </span>
          </div>
          {loginError && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#C0392B' }}>{loginError}</p>}
          <button
            type="submit"
            disabled={loginBusy}
            style={{ width: '100%', background: COLORS.orange, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, opacity: loginBusy ? 0.6 : 1 }}
          >
            {loginBusy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.emerald }}>China Shop — Admin</p>
        <button onClick={refresh} disabled={loading} style={{ background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: COLORS.textMuted }}>
          {loading ? 'Actualisation…' : '↻ Actualiser'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#FFF3E0', color: '#8A4B00', fontSize: 13, padding: '10px 24px' }}>{error}</div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 24 }}>
          <StatCard label="Commandes aujourd'hui" value={stats.todayOrders} />
          <StatCard label="Revenu du jour" value={`${stats.todayRevenue.toLocaleString('fr-FR')} FCFA`} />
          <StatCard label="Total commandes" value={stats.totalOrders} />
          <StatCard label="Livraisons express" value={stats.expressCount} accent={COLORS.orange} />
        </div>
      )}

      <div style={{ padding: '0 24px', display: 'flex', gap: 8, marginBottom: 16 }}>
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')}>Commandes</TabButton>
        <TabButton active={tab === 'products'} onClick={() => setTab('products')}>Produits</TabButton>
        <TabButton active={tab === 'partners'} onClick={() => setTab('partners')}>Livreurs</TabButton>
      </div>

      <div style={{ padding: '0 24px 40px' }}>
        {tab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    {o.delivery_type === 'expedition' ? (o.villes?.name || 'Expédition') : (o.communes?.name || '—')}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textFaint }}>
                    {new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, fontSize: 12, color: COLORS.textMuted }}>
                  <span>{o.delivery_type === 'expedition' ? '🚚 Expédition' : o.delivery_type === 'express' ? `⚡ Express${o.express_distance_km ? ` (${o.express_distance_km} km)` : ''}` : '📦 Standard'}</span>
                  <span>• {o.items_count} article{o.items_count > 1 ? 's' : ''}</span>
                  <span>• {o.payment_method === 'cash_on_delivery' ? 'Espèces' : o.payment_method || '—'}</span>
                  {o.delivery_phone && <span>• 📞 {o.delivery_phone}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.emerald }}>{Number(o.total_amount).toLocaleString('fr-FR')} FCFA</p>
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}` }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: COLORS.textFaint }}>Aucune commande</p>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setShowNewForm((s) => !s)}
              style={{ background: showNewForm ? COLORS.card : COLORS.orange, color: showNewForm ? COLORS.textMuted : '#fff', border: showNewForm ? `1px solid ${COLORS.border}` : 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}
            >
              {showNewForm ? 'Annuler' : '+ Ajouter un article'}
            </button>

            {showNewForm && (
              <form onSubmit={handleCreateProduct} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Nom *</p>
                  <input
                    required
                    value={newProduct.name}
                    onChange={(e) => editNewProduct('name', e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Description</p>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => editNewProduct('description', e.target.value)}
                    rows={2}
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Catégorie</p>
                  <input
                    value={newProduct.category}
                    onChange={(e) => editNewProduct('category', e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Lien "Comment l'utiliser"</p>
                  <input
                    value={newProduct.usage_link}
                    onChange={(e) => editNewProduct('usage_link', e.target.value)}
                    placeholder="https://…"
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Stock *</p>
                    <input
                      required
                      type="number"
                      value={newProduct.stock_qty}
                      onChange={(e) => editNewProduct('stock_qty', e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Prix détail *</p>
                    <input
                      required
                      type="number"
                      value={newProduct.retail_price}
                      onChange={(e) => editNewProduct('retail_price', e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.emerald, fontWeight: 600 }}>Prix gros *</p>
                    <input
                      required
                      type="number"
                      value={newProduct.wholesale_price}
                      onChange={(e) => editNewProduct('wholesale_price', e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.emerald}`, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ width: '100%', background: COLORS.emerald, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, opacity: creating ? 0.6 : 1 }}
                >
                  {creating ? 'Création…' : 'Créer l\'article'}
                </button>
                <p style={{ margin: 0, fontSize: 10, color: COLORS.textFaint }}>Vous pourrez ajouter une photo une fois l'article créé, dans sa fiche.</p>
              </form>
            )}{products.map((p) => {
              const expanded = expandedId === p.id
              return (
                <div key={p.id} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {[0, 1, 2].map((slot) => (
                        <div key={slot} style={{ position: 'relative', width: 44, height: 44, borderRadius: 8, background: '#F1F3F1', overflow: 'hidden' }}>
                          {p.image_urls?.[slot] ? (
                            <img src={p.image_urls[slot]} alt={`${p.name} ${slot + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: COLORS.textFaint }}>+</div>
                          )}
                          <label style={{ position: 'absolute', inset: 0, background: p.image_urls?.[slot] ? 'rgba(0,0,0,0.35)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <span style={{ color: p.image_urls?.[slot] ? '#fff' : 'transparent', fontSize: 9, fontWeight: 600 }}>{uploadingId === `${p.id}-${slot}` ? '…' : '📷'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(p, e.target.files?.[0], slot)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            
                        
                          
                        
                      
                    
    
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textMuted }}>
                        <input
                          type="checkbox"
                          checked={p.is_active}
                          onChange={(e) => editProduct(p.id, 'is_active', e.target.checked)}
                        />
                        Actif
                      </label>
                      <span
                        onClick={() => setExpandedId(expanded ? null : p.id)}
                        style={{ fontSize: 11, color: COLORS.emerald, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {expanded ? 'Réduire ▲' : 'Détails de l\'article ▼'}
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Nom</p>
                        <input
                          value={p.name}
                          onChange={(e) => editProduct(p.id, 'name', e.target.value)}
                          style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Description</p>
                        <textarea
                          value={p.description || ''}
                          onChange={(e) => editProduct(p.id, 'description', e.target.value)}
                          rows={3}
                          style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Catégorie</p>
                        <input
                          value={p.category || ''}
                          onChange={(e) => editProduct(p.id, 'category', e.target.value)}
                          style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Lien "Comment l'utiliser"</p>
                        <input
                          value={p.usage_link || ''}
                          onChange={(e) => editProduct(p.id, 'usage_link', e.target.value)}
                          placeholder="https://…"
                          style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Stock</p>
                      <input
                        type="number"
                        value={p.stock_qty}
                        onChange={(e) => editProduct(p.id, 'stock_qty', e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Prix détail</p>
                      <input
                        type="number"
                        value={p.retail_price}
                        onChange={(e) => editProduct(p.id, 'retail_price', e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.emerald, fontWeight: 600 }}>Prix gros</p>
                      <input
                        type="number"
                        value={p.wholesale_price}
                        onChange={(e) => editProduct(p.id, 'wholesale_price', e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.emerald}`, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveProduct(p)}
                      disabled={savingId === p.id}
                      style={{ flex: 1, background: COLORS.emerald, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, opacity: savingId === p.id ? 0.6 : 1 }}
                    >
                      {savingId === p.id ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      disabled={deletingId === p.id}
                      style={{ background: '#FFF0EE', color: '#C0392B', border: '1px solid #F5C6C0', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, opacity: deletingId === p.id ? 0.6 : 1 }}
                    >
                      {deletingId === p.id ? '…' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'partners' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setShowNewPartnerForm((s) => !s)}
              style={{ background: showNewPartnerForm ? COLORS.card : COLORS.orange, color: showNewPartnerForm ? COLORS.textMuted : '#fff', border: showNewPartnerForm ? `1px solid ${COLORS.border}` : 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}
            >
              {showNewPartnerForm ? 'Annuler' : '+ Ajouter un livreur'}
            </button>

            {showNewPartnerForm && (
              <form onSubmit={handleCreatePartner} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Nom *</p>
                  <input
                    required
                    value={newPartner.name}
                    onChange={(e) => editNewPartner('name', e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Téléphone * (identifiant de connexion)</p>
                  <input
                    required
                    value={newPartner.phone}
                    onChange={(e) => editNewPartner('phone', e.target.value)}
                    placeholder="07 XX XX XX XX"
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>Commune *</p>
                  <select
                    required
                    value={newPartner.commune_id}
                    onChange={(e) => editNewPartner('commune_id', e.target.value)}
                    style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.border}`, boxSizing: 'border-box' }}
                  >
                    <option value="">— Choisir —</option>
                    {communes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingPartner}
                  style={{ width: '100%', background: COLORS.emerald, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, opacity: creatingPartner ? 0.6 : 1 }}
                >
                  {creatingPartner ? 'Ajout…' : 'Ajouter le livreur'}
                </button>
                <p style={{ margin: 0, fontSize: 10, color: COLORS.textFaint }}>Maximum 5 livreurs validés par commune. Le livreur se connectera à son app avec ce numéro.</p>
              </form>
            )}

            {partners.map((p) => (
              <div key={p.id} style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name || 'Sans nom'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textMuted }}>{p.phone} • {p.communes?.name || '—'}</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8,
                    background: p.status === 'on_duty' ? '#EAF3DE' : '#F1F3F1',
                    color: p.status === 'on_duty' ? COLORS.emerald : COLORS.textMuted,
                  }}>
                    {p.status === 'on_duty' ? 'En service' : p.status === 'suspended' ? 'Suspendu' : 'Hors service'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, fontSize: 12, color: COLORS.textMuted }}>
                  <span>💰 Portefeuille : <strong style={{ color: COLORS.emerald }}>{Number(p.wallet_balance || 0).toLocaleString('fr-FR')} FCFA</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => togglePartnerValidated(p)}
                    style={{
                      flex: 1, border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600,
                      background: p.is_validated ? '#FFF3E0' : COLORS.emerald,
                      color: p.is_validated ? '#8A4B00' : '#fff',
                    }}
                  >
                    {p.is_validated ? 'Suspendre l\'accès' : 'Valider l\'accès'}
                  </button>
                  <button
                    onClick={() => handleDeletePartner(p)}
                    disabled={deletingPartnerId === p.id}
                    style={{ background: '#FFF0EE', color: '#C0392B', border: '1px solid #F5C6C0', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, opacity: deletingPartnerId === p.id ? 0.6 : 1 }}
                  >
                    {deletingPartnerId === p.id ? '…' : 'Retirer'}
                  </button>
                </div>
              </div>
            ))}
            {partners.length === 0 && (
              <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: COLORS.textFaint }}>Aucun livreur enregistré</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: COLORS.textMuted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: accent || COLORS.emerald }}>{value}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? COLORS.emerald : COLORS.card,
        color: active ? '#fff' : COLORS.textMuted,
        border: `1px solid ${active ? COLORS.emerald : COLORS.border}`,
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
                  }
