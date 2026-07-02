import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  useEffect(() => {
    // Request permission and get token
    async function registerForPushNotificationsAsync() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
    }

    registerForPushNotificationsAsync();

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped on notification:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nexus Companion</Text>
      <Text style={styles.subtitle}>Awaiting Client Approvals & Emergency Replies...</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status: Active</Text>
        <Text style={styles.tokenLabel}>Push Token Registered:</Text>
        <Text style={styles.tokenText}>{expoPushToken || 'Loading...'}</Text>
      </View>

      {notification && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>New Notification</Text>
          <Text style={styles.alertBody}>{notification.request.content.title}</Text>
          <Text style={styles.alertBody}>{notification.request.content.body}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f19',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e1e2d',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tokenLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  tokenText: {
    color: '#fff',
    fontSize: 10,
  },
  alertCard: {
    backgroundColor: '#4f46e5',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginTop: 16,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alertBody: {
    color: '#e0e7ff',
    fontSize: 14,
  }
});
