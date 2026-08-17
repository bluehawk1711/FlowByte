import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeData = async (value: any, key: string) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // console.log(e);
  }
};

export const getData = async <T>(key: string ) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value) as T;
    }
  } catch (e) {
    // console.log(e);
  }
};
