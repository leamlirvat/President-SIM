export default function Market({ country }) {
  const [offers, setOffers] = useState([]);

  async function createOffer(type, quantity, price) {
    await supabase.from("market_offers").insert({
      country_id: country.id,
      resource_type: type,
      quantity,
      price_per_unit: price,
    });
  }

  return (
    <div style={styles.market}>
      <h3>🛒 Marché</h3>
      <div style={styles.offers}>
        {offers.map((offer) => (
          <div key={offer.id} style={styles.offer}>
            <span>
              {offer.resource_type} x{offer.quantity}
            </span>
            <span>{offer.price_per_unit}$/unité</span>
            <button>Acheter</button>
          </div>
        ))}
      </div>
    </div>
  );
}
