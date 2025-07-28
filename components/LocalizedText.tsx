import { useTranslation } from "@/hooks/useTranslation";
import { getLocales } from "expo-localization";
import React from "react";
import {
  Platform,
  Text as RNText,
  TextProps as RNTextProps,
} from "react-native";

interface LocalizedTextProps extends RNTextProps {
  children?: React.ReactNode;
  translationKey?: string;
  translationOptions?: any;
}

export const LocalizedText = ({
  children,
  translationKey,
  translationOptions,
  style,
  ...props
}: LocalizedTextProps) => {
  const { t } = useTranslation();
  const deviceLanguage = getLocales()[0].languageCode;
  const textDirection = getLocales()[0].textDirection || "ltr";

  // Get the text content
  let textContent: string;
  if (translationKey) {
    textContent = t(translationKey, translationOptions);
  } else if (typeof children === "string") {
    textContent = children;
  } else {
    textContent = "";
  }

  // Web-specific props
  const webProps =
    Platform.OS === "web"
      ? {
          lang: deviceLanguage || "en",
          dir: textDirection,
        }
      : {};

  return (
    <RNText
      style={[
        {
          textAlign: textDirection === "rtl" ? "right" : "left",
        },
        style,
      ]}
      {...webProps}
      {...props}
    >
      {translationKey ? textContent : children}
    </RNText>
  );
};

export default LocalizedText;
