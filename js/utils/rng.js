export default class RNG {
    static seed = Math.floor(Math.random() * 2147483647);
    
    static setSeed(s) { 
        this.seed = s; 
    }
    
    static getSeed() { 
        return this.seed; 
    }
    
    static next() {
        this.seed = this.seed * 16807 % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    
    static random() { 
        return this.next(); 
    }
}