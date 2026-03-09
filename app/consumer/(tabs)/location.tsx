import LocationManagerScreen, {
  LocationApi,
} from "@/components/location/LocationManagerScreen";
import { UserLocation, consumerApi } from "@/services/api/consumer";

const locationApi: LocationApi<UserLocation> = {
  list: consumerApi.getUserLocations,
  create: consumerApi.createUserLocation,
  update: consumerApi.updateUserLocation,
  remove: consumerApi.deleteUserLocation,
};

export default function ConsumerLocationPage() {
  return (
    <LocationManagerScreen
      api={locationApi}
      accentColor="#667eea"
      createLabelPlaceholder="例如：家 / 公司 / 客戶A"
      saveSuccessMessage="位置已保存到您的帳戶"
    />
  );
}
