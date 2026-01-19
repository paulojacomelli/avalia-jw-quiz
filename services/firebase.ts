import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { GeneratedQuiz } from "../types";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const QUIZZES_COLLECTION = "generated_quizzes";

/**
 * Saves a generated quiz to Firebase for community play and global entropy.
 */
export const saveGeneratedQuiz = async (quiz: GeneratedQuiz, appName: string, theme?: string, subTopic?: string) => {
    try {
        await addDoc(collection(db, QUIZZES_COLLECTION), {
            ...quiz,
            appName,
            theme: theme || "Geral",
            subTopic: subTopic || "",
            createdAt: serverTimestamp(),
            // Ensure keywords are stored for global entropy
            keywordList: quiz.keywords || []
        });
    } catch (error) {
        console.error("Error saving quiz to Firebase:", error);
    }
};

/**
 * Fetches the latest unique keywords from the community to improve variety.
 */
export const getGlobalKeywords = async (max: number = 35): Promise<string[]> => {
    try {
        const q = query(
            collection(db, QUIZZES_COLLECTION),
            orderBy("createdAt", "desc"),
            limit(100) // Fetch more to filter for uniqueness
        );
        const snapshot = await getDocs(q);
        const keywordsSet = new Set<string>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.keywordList && Array.isArray(data.keywordList)) {
                data.keywordList.forEach((kw: string) => {
                    if (keywordsSet.size < max) keywordsSet.add(kw);
                });
            }
        });

        return Array.from(keywordsSet);
    } catch (error) {
        console.error("Error fetching global keywords:", error);
        return [];
    }
};

/**
 * Returns a random quiz from the community library, optionally filtered by theme or subTopic.
 */
export const getRandomPrebuiltQuiz = async (appName: string, theme?: string, subTopic?: string): Promise<GeneratedQuiz | null> => {
    try {
        let q;
        if (theme && subTopic) {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                where("theme", "==", theme),
                where("subTopic", "==", subTopic),
                limit(50)
            );
        } else if (theme) {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                where("theme", "==", theme),
                limit(50)
            );
        } else {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                limit(100)
            );
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const randomIndex = Math.floor(Math.random() * snapshot.docs.length);
        const data = snapshot.docs[randomIndex].data() as any;

        return {
            title: data.title,
            questions: data.questions,
            keywords: data.keywordList || [],
            focalTheme: data.focalTheme || "Comunidade"
        } as GeneratedQuiz;
    } catch (error) {
        console.error("Error fetching prebuilt quiz:", error);
        return null;
    }
};

/**
 * Identifies which themes and subtopics have available quizzes.
 */
export const getAvailableLibraryThemes = async (appName: string): Promise<Record<string, string[]>> => {
    try {
        const q = query(
            collection(db, QUIZZES_COLLECTION),
            where("appName", "==", appName),
            limit(200) // Sample last 200 quizzes to find available themes
        );
        const snapshot = await getDocs(q);
        const themesMap: Record<string, Set<string>> = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data() as any;
            const theme = data.theme || "Geral";
            const sub = data.subTopic || "";

            if (!themesMap[theme]) themesMap[theme] = new Set();
            if (sub) themesMap[theme].add(sub);
        });

        // Convert Sets to Arrays
        const result: Record<string, string[]> = {};
        Object.keys(themesMap).forEach(key => {
            result[key] = Array.from(themesMap[key]);
        });

        return result;
    } catch (error) {
        console.error("Error identifying available themes:", error);
        return {};
    }
};
