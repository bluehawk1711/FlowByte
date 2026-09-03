import { AppColors, useAppTheme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  // Subscribe so the tab chrome repaints when accent/background mode changes.
  useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.accentCyan,
        tabBarInactiveTintColor: AppColors.iconDefault,
        tabBarStyle: {
          backgroundColor: AppColors.backgroundDark,
          borderTopColor: AppColors.divider,
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
      <Tabs.Screen
        name="search/index"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cloud/index"
        options={{
          title: "Cloud",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "cloud" : "cloud-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden screen for adding music */}
      <Tabs.Screen
        name="add-music/index"
        options={{
          href: null,
        }}
      />
      {/* Hidden screen for offline downloads */}
      <Tabs.Screen
        name="downloads/index"
        options={{
          href: null,
        }}
      />
      {/* Hidden screen for saved YouTube links */}
      <Tabs.Screen
        name="saved/index"
        options={{
          href: null,
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
