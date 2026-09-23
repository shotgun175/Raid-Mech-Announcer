use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub general: GeneralSettings,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GeneralSettings {
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v032_settings_round_trip_unchanged() {
        let original: Value = serde_json::json!({
            "general": {
                "accentColor": "theme-blue",
                "scale": "1",
                "logScale": "0",
                "alwaysOnTop": true,
                "hideMeterOnStart": false,
                "betaChannel": false
            },
            "shortcuts": { "hideMeter": "Ctrl+Shift+H" }
        });
        let settings: Settings = serde_json::from_value(original.clone()).unwrap();
        let round_tripped = serde_json::to_value(&settings).unwrap();
        assert_eq!(round_tripped, original);
    }
}
