_cells()
{
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    local commands="admin completion config deps doc help i18n install install-cli list start stop test update version"
    case "${prev}" in
        configure)
            _cec_configure
            return 0
        ;;
        completion)
            _cec_completion
            return 0
        ;;
        # --*)
        #     _cec_help
        #     return 0
        # ;;
        *)
        ;;
    esac
    
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}))
    return 0
}
complete -F _cells cells cells.exe ./cells

_cec_help(){
    case "$cur" in
        -*)
            COMPREPLY=( $( compgen -W "--help" -- "$cur"))
            return 0
        ;;
    esac
}

_cec_configure() {
    local configureOpts
    configureOpts="--apiKey --apiSecret --login --password --skipVerify --url"
    case "$cur" in
        -*)
            # COMPREPLY=( $( compgen -W "--config" -- "$cur") )
            COMPREPLY=($(compgen -W "${configureOpts}" -- "$cur"))
            return 0
        ;;
        *)
            COMPREPLY=($(compgen -W "-help" -- "$cur"))
            return 0
        ;;
    esac
}