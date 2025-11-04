import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function Progress() {
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
});
