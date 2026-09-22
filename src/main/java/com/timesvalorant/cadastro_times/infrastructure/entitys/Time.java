package com.timesvalorant.cadastro_times.infrastructure.entitys;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "time")
@Entity

public class Time {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @Column(name = "nome", unique = true)
    private String nome;

    @Column(name = "tier")
    private Integer tier;

    @Column(name = "starPlayer")
    private String starPlayer;

    @Column(name = "internacionais")
    private Boolean internacionais;
}
