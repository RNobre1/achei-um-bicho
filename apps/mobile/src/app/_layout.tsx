import { Commissioner_700Bold, Commissioner_800ExtraBold } from '@expo-google-fonts/commissioner'
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { cores } from '../tema'

export default function Layout() {
  const [fontesProntas] = useFonts({
    Commissioner_700Bold,
    Commissioner_800ExtraBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  })
  if (!fontesProntas) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.chuva } }}>
        <Stack.Screen name="(abas)" />
        <Stack.Screen name="caso/[id]" />
      </Stack>
    </>
  )
}
