/**
 * Extend Shopify Checkout with a custom Post Purchase user experience.
 * This template provides two extension points:
 *
 *  1. ShouldRender - Called first, during the checkout process, when the
 *     payment page loads.
 *  2. Render - If requested by `ShouldRender`, will be rendered after checkout
 *     completes
 */
import React, { useEffect, useState } from "react";
import {
  extend,
  render,
  BlockStack,
  Button,
  Banner,
  Radio,
  Layout,
  useExtensionInput,
  View,
  Select,
  Text,
  CalloutBanner,
} from "@shopify/post-purchase-ui-extensions-react";

const APP_URL = "https://api.gvweb.com.mx";

extend(
  "Checkout::PostPurchase::ShouldRender",
  async ({ storage, inputData }) => {
    console.log("inputData", inputData.shop.domain);
    const boutiquesByStore = await fetch(
      `${APP_URL}/dashboard/stores/${inputData.shop.domain}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "false",
        },
      }
    ).then((response) => response.json());

    await storage.update(boutiquesByStore);

    return {
      render: true,
    };
  }
);

/**
 * Entry point for the `Render` Extension Point
 *
 * Returns markup composed of remote UI components.  The Render extension can
 * optionally make use of data stored during `ShouldRender` extension point to
 * expedite time-to-first-meaningful-paint.
 */
render("Checkout::PostPurchase::Render", () => <App />);

export function App() {
  const { storage, inputData, done } = useExtensionInput();
  const [loading, setLoading] = useState(false);
  const [ciudad, setCiudad] = useState("");
  const [boutique, setBoutique] = useState("");
  const [boutiquesSelected, setBoutiquestSelected] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    const locations = storage.initialData.map((place) => {
      return {
        label: place.location,
        value: place.value,
      };
    });
    setLocalidades(locations);
  }, [storage.initialData]);

  useEffect(() => {
    const [filtered] = storage.initialData.filter(
      ({ value }) => value === ciudad
    );
    if (filtered && Array.isArray(filtered?.children)) {
      setBoutiquestSelected(filtered.children);
      setBoutique("");
    }
  }, [ciudad]);

  async function onBoutiqueChange(value) {
    setLoading(true);
    setBoutique(value);
    await fetch(
      `${APP_URL}/api/v1/webhook/shopify/public/public/setcomment/${inputData.shop.domain}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "false",
        },
        body: JSON.stringify({
          value,
          shop: inputData.shop,
          initialPurchase: inputData.initialPurchase,
        }),
      }
    ).then((response) => response.json());
    done();
  }

  return (
    <BlockStack spacing="loose">
      <Layout
        maxInlineSize={0.95}
        media={[
          { viewportSize: "small", sizes: [1, 30, 1] },
          { viewportSize: "medium", sizes: [500, 30, 0.3] },
          { viewportSize: "large", sizes: [500, 30, 0.3] },
        ]}
      >
        <View blockPadding="base">
          <Banner
            status="info"
            title="Para resolver cualquier duda o sugerencia, selecciona tu boutique más cercana."
            blockPadding="base"
          />
          <View padding="base" alignment="center" blockPadding="base">
            <Select
              label="Selecciona la ciudad"
              value={ciudad}
              options={localidades}
              onChange={(value) => setCiudad(value)}
            />
          </View>
          {loading ? (
            <View padding="base" blockPadding="loose">
              <CalloutBanner title="Enviando información">
                <Text>Por favor espere un momento...</Text>
              </CalloutBanner>
            </View>
          ) : (
            <View padding="base" blockPadding="loose">
              {/* Content */}
              {boutiquesSelected.map((obj, i) => (
                <View blockPadding="base" key={`${obj.name}_${i}_option`}>
                  <Radio
                    id={`${obj.name} - ${obj.direction}`}
                    key={`${obj.name}_${i}_check`}
                    name="boutique"
                    onChange={() => onBoutiqueChange(obj)}
                  >
                    {`${obj.name} - ${obj.direction}`}
                  </Radio>
                </View>
              ))}
            </View>
          )}

          {!loading && (
            <View padding="base" alignment="center" blockPadding="base">
              <Button plain onClick={() => done()}>
                No estoy interesado, continuar con la compra
              </Button>
            </View>
          )}
        </View>
      </Layout>
    </BlockStack>
  );
}
