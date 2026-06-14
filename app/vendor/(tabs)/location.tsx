import LocationManagerScreen, {
  LocationApi,
} from "@/components/location/LocationManagerScreen";
import { MerchantLocation, merchantApi } from "@/services/api/merchant";
import { pixelColors } from "@/theme/pixel";

const locationApi: LocationApi<MerchantLocation> = {
  list: merchantApi.getMerchantLocations,
  create: merchantApi.createMerchantLocation,
  update: merchantApi.updateMerchantLocation,
  remove: merchantApi.deleteMerchantLocation,
};

export default function VendorLocationPage() {
  return (
    <LocationManagerScreen
      api={locationApi}
      accentColor={pixelColors.red}
      createLabelPlaceholder="例如：附近地標名稱 / 店家名稱"
      saveSuccessMessage="位置已保存到您的商家帳戶"
    />
  );
}
