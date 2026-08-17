import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.accentCyan,
        tabBarInactiveTintColor: Colors[colorScheme ?? "dark"].tabIconDefault,
        tabBarStyle: {
          backgroundColor:  "#0A0A0A",
          borderTopColor:  "#1A1A1A",
          // paddingTop: 8,
          // height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          // marginTop: 4,
        },
        headerShown: false,
        // tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="folders/index"
        options={{
          title: "Folders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "folder" : "folder-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden screen for folder music list */}
      <Tabs.Screen
        name="folders/[id]/index"
        options={{
          href: null,
        }}
      />
       <Tabs.Screen
        name="playlist/[id]/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden screens for navigation */}
      <Tabs.Screen
        name="favourite/index"
       options={{
          title: "Favourite",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="playing/index"
        options={{
          title: "Playing",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "play" : "play-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="playlist/index"
        options={{
          title: "Playlist",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
