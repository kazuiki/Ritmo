import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
	Alert,
	Image,
	ImageBackground,
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";

export default function Progress() {
	const router = useRouter();
	const [showParentalLockModal, setShowParentalLockModal] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(ParentalLockAuthService.isTabAuthenticated('progress'));
	const [pin, setPin] = useState(['', '', '', '']);
	const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

	// Check parental lock on component mount and when focused
	useEffect(() => {
		checkParentalLock();
		
		// Listen to authentication changes
		const authListener = (isAuth: boolean) => {
			setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('progress'));
		};
		
		ParentalLockAuthService.addListener(authListener);
		
		return () => {
			ParentalLockAuthService.removeListener(authListener);
		};
	}, []);

	useFocusEffect(
		React.useCallback(() => {
			// Update authentication state and check parental lock when focusing on this tab
			setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('progress'));
			checkParentalLock();
		}, [])
	);

	const checkParentalLock = async () => {
		const isEnabled = await ParentalLockService.isEnabled();
		const isTabAuth = ParentalLockAuthService.isTabAuthenticated('progress');
		if (isEnabled && !isTabAuth) {
			setShowParentalLockModal(true);
			return;
		}
	};

	const handlePinInput = (index: number, value: string) => {
		if (value.length > 1) return;
		
		const newPin = [...pin];
		newPin[index] = value;
		setPin(newPin);

		if (value && index < 3) {
			pinRefs[index + 1].current?.focus();
		}
	};

	const handleBackspace = (index: number, value: string) => {
		if (value === '' && index > 0) {
			pinRefs[index - 1].current?.focus();
		}
	};

	const unlockAccess = async () => {
		if (pin.every(digit => digit !== '')) {
			const inputPin = pin.join('');
			const isValid = await ParentalLockService.verifyPin(inputPin);
			
			if (isValid) {
				ParentalLockAuthService.setAuthenticated(true, 'progress');
				setShowParentalLockModal(false);
				setPin(['', '', '', '']);
			} else {
				Alert.alert("Incorrect PIN", "Please try again.");
				setPin(['', '', '', '']);
				pinRefs[0].current?.focus();
			}
		} else {
			Alert.alert("Incomplete PIN", "Please enter all 4 digits.");
		}
	};

	const cancelAccess = () => {
		setPin(['', '', '', '']);
		router.replace("/(tabs)/home");
	};

	return (
		<View style={styles.container}>
			{/* Background Image */}
			<Image
				source={require("../../assets/background.png")}
				style={styles.backgroundImage}
				resizeMode="cover"
			/>
			
			<View style={styles.header}>
				<Image
					source={require("../../assets/images/ritmoNameLogo.png")}
					style={styles.brandLogo}
				/>
			</View>
			<View style={styles.content}>
				<Text>Progress</Text>
			</View>

			{/* Parental Lock Modal */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={showParentalLockModal}
				onRequestClose={cancelAccess}
				statusBarTranslucent={true}
			>
				<View style={styles.modalOverlay}>
					<ImageBackground
						source={require("../../assets/background.png")}
						style={styles.modalBackground}
						resizeMode="cover"
					>
						<View style={styles.modalContainer}>
							<View style={styles.modalContent}>
								<View style={styles.lockIconContainer}>
									<Ionicons name="lock-closed" size={48} color="#4A5568" />
								</View>
								
								<Text style={styles.modalTitle}>Parental Lock</Text>
								<Text style={styles.modalSubtitle}>
									Access restricted to parents{'\n'}or guardians only
								</Text>

								<Text style={styles.modalContentTitle}>
									Please enter your 4-digit PIN to continue
								</Text>
								
								<View style={styles.pinContainer}>
									{pin.map((digit, index) => (
										<TextInput
											key={index}
											ref={pinRefs[index]}
											style={[
												styles.pinInput,
												digit ? styles.pinInputFilled : null
											]}
											value={digit}
											onChangeText={(value) => handlePinInput(index, value)}
											onKeyPress={({ nativeEvent }) => {
												if (nativeEvent.key === 'Backspace') {
													handleBackspace(index, digit);
												}
											}}
											keyboardType="numeric"
											maxLength={1}
											secureTextEntry
											textAlign="center"
											selectTextOnFocus={true}
											autoFocus={index === 0}
										/>
									))}
								</View>

								<TouchableOpacity style={styles.forgotPin}>
									<Text style={styles.forgotPinText}>Forgot PIN?</Text>
								</TouchableOpacity>
								
								<View style={styles.buttonContainer}>
									<TouchableOpacity style={styles.unlockButton} onPress={unlockAccess}>
										<Text style={styles.unlockText}>Unlock Access</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.cancelButton} onPress={cancelAccess}>
										<Text style={styles.cancelText}>Cancel</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</ImageBackground>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	backgroundImage: {
		position: "absolute",
		width: "100%",
		height: "100%",
	},
	container: {
		flex: 1,
	},
	header: {
		paddingTop: 50,
		paddingHorizontal: 16,
	},
	brandLogo: {
		width: 120,
		height: 30,
		resizeMode: "contain",
		marginLeft: -22,
		marginTop: -20,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
	},
	modalBackground: {
		flex: 1,
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modalContent: {
		backgroundColor: "#FFFFFF",
		borderRadius: 25,
		borderWidth: 2,
		borderColor: "#CFF6EB",
		padding: 35,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 12,
		width: "90%",
		maxWidth: 350,
	},
	lockIconContainer: {
		marginBottom: 20,
		opacity: 0.7,
	},
	modalTitle: {
		fontSize: 28,
		fontWeight: "700",
		fontFamily: "ITIM",
		color: "#333",
		marginBottom: 8,
		textAlign: "center",
	},
	modalSubtitle: {
		fontSize: 16,
		fontWeight: "400",
		fontFamily: "ITIM",
		color: "#666",
		textAlign: "center",
		marginBottom: 25,
		lineHeight: 22,
	},
	modalContentTitle: {
		fontSize: 14,
		fontWeight: "600",
		fontFamily: "ITIM",
		color: "#555",
		marginBottom: 25,
		textAlign: "center",
		lineHeight: 20,
	},
	pinContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 25,
		gap: 12,
	},
	pinInput: {
		width: 55,
		height: 55,
		borderRadius: 12,
		backgroundColor: "#F7F7F7",
		borderWidth: 2,
		borderColor: "#E0E0E0",
		textAlign: "center",
		fontSize: 24,
		fontWeight: "600",
		color: "#333",
		fontFamily: "ITIM",
	},
	pinInputFilled: {
		backgroundColor: "#E8F5E8",
		borderColor: "#4CAF50",
	},
	forgotPin: {
		marginBottom: 30,
	},
	forgotPinText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#007AFF",
		textDecorationLine: "underline",
		fontFamily: "ITIM",
	},
	buttonContainer: {
		width: "100%",
		gap: 12,
	},
	unlockButton: {
		backgroundColor: "#4CAF50",
		paddingVertical: 15,
		paddingHorizontal: 25,
		borderRadius: 25,
		alignItems: "center",
		shadowColor: "#4CAF50",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	unlockText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#FFFFFF",
		fontFamily: "ITIM",
	},
	cancelButton: {
		backgroundColor: "transparent",
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 25,
		borderWidth: 2,
		borderColor: "#E0E0E0",
		alignItems: "center",
	},
	cancelText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#666",
		fontFamily: "ITIM",
	},
});
